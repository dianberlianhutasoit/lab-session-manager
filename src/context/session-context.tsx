import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  users as initialUsers,
  classes as initialClasses,
  schedules as initialSchedules,
  sessions as initialSessions,
  attendance as initialAttendance,
} from '@/data/dummy';
import { isFirebaseConfigured } from '@/config/firebase';
import {
  COLLECTIONS,
  subscribeToCollection,
  seedInitialFirestoreDataIfEmpty,
  firestoreCreateClass,
  firestoreUpdateClass,
  firestoreDeleteClass,
  firestoreCreateSessionAndSchedule,
  firestoreUpdateSessionAndSchedule,
  firestoreDeleteSessionAndSchedule,
  firestoreUpdateSessionStatus,
  firestoreRecordAttendance,
} from '@/services/firestore-service';
import type {
  Attendance,
  AttendanceRecord,
  LabClass,
  LabClassFormInput,
  Schedule,
  Session,
  SessionScheduleFormInput,
  SessionStatus,
  User,
} from '@/types';
import type { LabClassWithDetails } from '@/components/asisten/class-card';

export interface SessionWithDetails extends Session {
  schedule?: Schedule;
  assistant?: User;
  attendanceCount: number;
}

interface SessionContextValue {
  classes: LabClass[];
  sessions: Session[];
  schedules: Schedule[];
  users: User[];
  attendance: Attendance[];
  isFirestoreConnected: boolean;
  currentAssistantId: string;
  setCurrentAssistantId: (id: string) => void;
  // SRS-07: CRUD Kelas Praktikum (classes)
  createClass: (input: LabClassFormInput) => Promise<LabClass>;
  updateClass: (classId: string, input: LabClassFormInput) => Promise<boolean>;
  deleteClass: (classId: string) => Promise<{ success: boolean; message?: string }>;
  // SRS-07: CRUD Jadwal & Sesi Praktikum (schedules & sessions)
  createSessionSchedule: (input: SessionScheduleFormInput) => Promise<SessionWithDetails>;
  updateSessionSchedule: (
    sessionId: string,
    input: SessionScheduleFormInput
  ) => Promise<boolean>;
  deleteSessionSchedule: (sessionId: string) => Promise<boolean>;
  // SRS-06 / SRS-08: Membuka dan menutup sesi praktikum
  openSession: (sessionId: string) => void;
  closeSession: (sessionId: string) => void;
  toggleSessionStatus: (sessionId: string) => void;
  recordAttendance: (sessionId: string, userId: string, recordedAt: string) => boolean;
  // Helper queries
  getClassById: (classId: string) => LabClass | undefined;
  getScheduleById: (scheduleId: string) => Schedule | undefined;
  getAssistantById: (assistantId: string) => User | undefined;
  getAttendanceCount: (sessionId: string) => number;
  getClassesWithDetails: () => LabClassWithDetails[];
  getSessionsWithDetails: () => SessionWithDetails[];
  // Rekap Presensi Praktikan
  getSessionAttendanceRecords: (sessionId: string) => AttendanceRecord[];
  getPractitioners: () => User[];
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [classes, setClasses] = useState<LabClass[]>(initialClasses);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [attendance, setAttendance] = useState<Attendance[]>(initialAttendance);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const attendanceRef = useRef<Attendance[]>(initialAttendance);
  const [currentAssistantId, setCurrentAssistantId] = useState<string>('user-asisten-001');

  useEffect(() => {
    attendanceRef.current = attendance;
  }, [attendance]);

  // Sinkronisasi real-time dengan Firebase Firestore jika dikonfigurasi
  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }

    let isMounted = true;
    seedInitialFirestoreDataIfEmpty().then(() => {
      if (isMounted) {
        setIsFirestoreConnected(true);
      }
    });

    const unsubClasses = subscribeToCollection<LabClass>(COLLECTIONS.CLASSES, (items) => {
      if (items.length > 0) setClasses(items);
    });

    const unsubSchedules = subscribeToCollection<Schedule>(COLLECTIONS.SCHEDULES, (items) => {
      if (items.length > 0) setSchedules(items);
    });

    const unsubSessions = subscribeToCollection<Session>(COLLECTIONS.SESSIONS, (items) => {
      if (items.length > 0) setSessions(items);
    });

    const unsubAttendance = subscribeToCollection<Attendance>(COLLECTIONS.ATTENDANCE, (items) => {
      setAttendance(items);
    });

    const unsubUsers = subscribeToCollection<User>(COLLECTIONS.USERS, (items) => {
      if (items.length > 0) setUsers(items);
    });

    return () => {
      isMounted = false;
      unsubClasses?.();
      unsubSchedules?.();
      unsubSessions?.();
      unsubAttendance?.();
      unsubUsers?.();
    };
  }, []);

  // SRS-07: Create Kelas Praktikum
  const createClass = useCallback(async (input: LabClassFormInput): Promise<LabClass> => {
    const now = new Date().toISOString();
    const newClass: LabClass = {
      id: `class-${Date.now()}`,
      courseCode: input.courseCode.trim().toUpperCase(),
      title: input.title.trim(),
      className: input.className.trim(),
      room: input.room.trim(),
      assistantId: input.assistantId,
      semester: input.semester?.trim() || 'Ganjil 2026/2027',
      capacity: input.capacity ?? 30,
      createdAt: now,
      updatedAt: now,
    };

    setClasses((prev) => [...prev, newClass]);

    if (isFirebaseConfigured) {
      await firestoreCreateClass(newClass);
    }

    return newClass;
  }, []);

  // SRS-07: Update Kelas Praktikum & sinkronkan ke jadwal terkait
  const updateClass = useCallback(
    async (classId: string, input: LabClassFormInput): Promise<boolean> => {
      const targetExists = classes.some((c) => c.id === classId);
      if (!targetExists) return false;

      const now = new Date().toISOString();
      const updatedFields: Partial<LabClass> = {
        courseCode: input.courseCode.trim().toUpperCase(),
        title: input.title.trim(),
        className: input.className.trim(),
        room: input.room.trim(),
        assistantId: input.assistantId,
        semester: input.semester?.trim(),
        capacity: input.capacity,
        updatedAt: now,
      };

      setClasses((prev) =>
        prev.map((cls) => (cls.id === classId ? { ...cls, ...updatedFields } : cls))
      );

      // Sinkronkan courseCode, title, dan className ke schedules yang terkait dengan classId
      const relatedScheduleIds: string[] = [];
      setSchedules((prev) =>
        prev.map((sch) => {
          const isRelated =
            sch.classId === classId ||
            sessions.some((s) => s.scheduleId === sch.id && s.classId === classId);
          if (isRelated) {
            relatedScheduleIds.push(sch.id);
            return {
              ...sch,
              courseCode: updatedFields.courseCode ?? sch.courseCode,
              title: updatedFields.title ?? sch.title,
              className: updatedFields.className ?? sch.className,
            };
          }
          return sch;
        })
      );

      if (isFirebaseConfigured) {
        await firestoreUpdateClass(classId, updatedFields, relatedScheduleIds);
      }

      return true;
    },
    [classes, sessions]
  );

  // SRS-07: Delete Kelas Praktikum (DITOLAK jika kelas masih memiliki sesi)
  const deleteClass = useCallback(
    async (classId: string): Promise<{ success: boolean; message?: string }> => {
      const targetClass = classes.find((c) => c.id === classId);
      if (!targetClass) {
        return { success: false, message: 'Data kelas tidak ditemukan.' };
      }

      const associatedSessions = sessions.filter((sess) => {
        if (sess.classId === classId) return true;
        const sch = schedules.find((s) => s.id === sess.scheduleId);
        return sch?.classId === classId;
      });

      if (associatedSessions.length > 0) {
        return {
          success: false,
          message: `Kelas "${targetClass.title} (${targetClass.className})" tidak dapat dihapus karena masih memiliki ${associatedSessions.length} sesi praktikum terjadwal. Silakan hapus sesi terkait terlebih dahulu.`,
        };
      }

      setClasses((prev) => prev.filter((c) => c.id !== classId));

      if (isFirebaseConfigured) {
        await firestoreDeleteClass(classId);
      }

      return { success: true };
    },
    [classes, sessions, schedules]
  );

  // SRS-07: Create Sesi & Jadwal Praktikum
  const createSessionSchedule = useCallback(
    async (input: SessionScheduleFormInput): Promise<SessionWithDetails> => {
      const timestamp = Date.now();
      const now = new Date().toISOString();
      const scheduleId = `schedule-${timestamp}`;
      const sessionId = `session-${timestamp}`;

      const newSchedule: Schedule = {
        id: scheduleId,
        classId: input.classId,
        className: input.className?.trim(),
        sessionNumber: input.sessionNumber,
        topic: input.topic?.trim(),
        courseCode: input.courseCode.trim().toUpperCase(),
        title: input.title.trim(),
        date: input.date.trim(),
        startTime: input.startTime.trim(),
        endTime: input.endTime.trim(),
        room: input.room.trim(),
      };

      const newSession: Session = {
        id: sessionId,
        classId: input.classId,
        scheduleId,
        assistantId: input.assistantId,
        status: input.status ?? 'CLOSED',
        createdAt: now,
        updatedAt: now,
      };

      setSchedules((prev) => [...prev, newSchedule]);
      setSessions((prev) => [...prev, newSession]);

      if (isFirebaseConfigured) {
        await firestoreCreateSessionAndSchedule(newSchedule, newSession);
      }

      return {
        ...newSession,
        schedule: newSchedule,
        assistant: users.find((u) => u.id === newSession.assistantId),
        attendanceCount: 0,
      };
    },
    [users]
  );

  // SRS-07: Update Sesi & Jadwal Praktikum
  const updateSessionSchedule = useCallback(
    async (sessionId: string, input: SessionScheduleFormInput): Promise<boolean> => {
      const existingSession = sessions.find((s) => s.id === sessionId);
      if (!existingSession) return false;

      const scheduleId = existingSession.scheduleId;
      const now = new Date().toISOString();

      const sessionUpdates: Partial<Session> = {
        classId: input.classId,
        assistantId: input.assistantId,
        status: input.status ?? existingSession.status,
        updatedAt: now,
      };

      const scheduleUpdates: Partial<Schedule> = {
        classId: input.classId,
        className: input.className?.trim(),
        sessionNumber: input.sessionNumber,
        topic: input.topic?.trim(),
        courseCode: input.courseCode.trim().toUpperCase(),
        title: input.title.trim(),
        date: input.date.trim(),
        startTime: input.startTime.trim(),
        endTime: input.endTime.trim(),
        room: input.room.trim(),
      };

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, ...sessionUpdates } : s))
      );

      setSchedules((prev) =>
        prev.map((sch) => (sch.id === scheduleId ? { ...sch, ...scheduleUpdates } : sch))
      );

      if (isFirebaseConfigured) {
        await firestoreUpdateSessionAndSchedule(
          sessionId,
          scheduleId,
          sessionUpdates,
          scheduleUpdates
        );
      }

      return true;
    },
    [sessions]
  );

  // SRS-07: Delete Sesi & Jadwal Praktikum
  const deleteSessionSchedule = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const targetSession = sessions.find((s) => s.id === sessionId);
      if (!targetSession) return false;

      const scheduleId = targetSession.scheduleId;
      const relatedAttendanceIds = attendance
        .filter((a) => a.sessionId === sessionId)
        .map((a) => a.id);

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSchedules((prev) => prev.filter((sch) => sch.id !== scheduleId));
      setAttendance((prev) => prev.filter((a) => a.sessionId !== sessionId));

      if (isFirebaseConfigured) {
        await firestoreDeleteSessionAndSchedule(
          sessionId,
          scheduleId,
          relatedAttendanceIds
        );
      }

      return true;
    },
    [sessions, attendance]
  );

  // Membuka sesi praktikum
  const openSession = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'OPEN' as SessionStatus } : s))
    );
    if (isFirebaseConfigured) {
      firestoreUpdateSessionStatus(sessionId, 'OPEN');
    }
  }, []);

  // Menutup sesi praktikum
  const closeSession = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'CLOSED' as SessionStatus } : s))
    );
    if (isFirebaseConfigured) {
      firestoreUpdateSessionStatus(sessionId, 'CLOSED');
    }
  }, []);

  // Toggle status sesi praktikum
  const toggleSessionStatus = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const nextStatus: SessionStatus = s.status === 'OPEN' ? 'CLOSED' : 'OPEN';
          if (isFirebaseConfigured) {
            firestoreUpdateSessionStatus(sessionId, nextStatus);
          }
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  }, []);

  const recordAttendance = useCallback(
    (sessionId: string, userId: string, recordedAt: string): boolean => {
      const alreadyRecorded = attendanceRef.current.some(
        (record) => record.sessionId === sessionId && record.userId === userId
      );
      if (alreadyRecorded) return false;

      const newRecord: Attendance = {
        id: `attendance-${sessionId}-${userId}`,
        sessionId,
        userId,
        recordedAt,
      };

      const nextAttendance = [...attendanceRef.current, newRecord];
      attendanceRef.current = nextAttendance;
      setAttendance(nextAttendance);

      if (isFirebaseConfigured) {
        firestoreRecordAttendance(newRecord);
      }

      return true;
    },
    []
  );

  const getClassById = useCallback(
    (classId: string) => classes.find((cls) => cls.id === classId),
    [classes]
  );

  const getScheduleById = useCallback(
    (scheduleId: string) => schedules.find((sch) => sch.id === scheduleId),
    [schedules]
  );

  const getAssistantById = useCallback(
    (assistantId: string) => users.find((u) => u.id === assistantId),
    [users]
  );

  const getAttendanceCount = useCallback(
    (sessionId: string) => attendance.filter((a) => a.sessionId === sessionId).length,
    [attendance]
  );

  const getClassesWithDetails = useCallback((): LabClassWithDetails[] => {
    return classes.map((cls) => {
      const sessionCount = sessions.filter((sess) => {
        if (sess.classId === cls.id) return true;
        const sch = schedules.find((s) => s.id === sess.scheduleId);
        return sch?.classId === cls.id;
      }).length;

      return {
        ...cls,
        assistant: getAssistantById(cls.assistantId),
        sessionCount,
      };
    });
  }, [classes, sessions, schedules, getAssistantById]);

  const getSessionsWithDetails = useCallback((): SessionWithDetails[] => {
    return sessions.map((sess) => ({
      ...sess,
      schedule: getScheduleById(sess.scheduleId),
      assistant: getAssistantById(sess.assistantId),
      attendanceCount: getAttendanceCount(sess.id),
    }));
  }, [sessions, getScheduleById, getAssistantById, getAttendanceCount]);

  // Mengambil seluruh riwayat presensi beserta identitas praktikan pada suatu sesi
  const getSessionAttendanceRecords = useCallback(
    (sessionId: string): AttendanceRecord[] => {
      const records = attendance.filter((a) => a.sessionId === sessionId);
      return records.map((rec) => {
        const student = users.find((u) => u.id === rec.userId);
        return {
          id: rec.id,
          sessionId: rec.sessionId,
          userId: rec.userId,
          userName: student?.name ?? 'Praktikan Tidak Dikenal',
          userEmail: student?.email ?? '-',
          recordedAt: rec.recordedAt,
        };
      });
    },
    [attendance, users]
  );

  // Mengambil daftar praktikan terdaftar
  const getPractitioners = useCallback((): User[] => {
    return users.filter((u) => u.role === 'praktikan');
  }, [users]);

  const value = useMemo(
    () => ({
      classes,
      sessions,
      schedules,
      users,
      attendance,
      isFirestoreConnected,
      currentAssistantId,
      setCurrentAssistantId,
      createClass,
      updateClass,
      deleteClass,
      createSessionSchedule,
      updateSessionSchedule,
      deleteSessionSchedule,
      openSession,
      closeSession,
      toggleSessionStatus,
      recordAttendance,
      getClassById,
      getScheduleById,
      getAssistantById,
      getAttendanceCount,
      getClassesWithDetails,
      getSessionsWithDetails,
      getSessionAttendanceRecords,
      getPractitioners,
    }),
    [
      classes,
      sessions,
      schedules,
      users,
      attendance,
      isFirestoreConnected,
      currentAssistantId,
      createClass,
      updateClass,
      deleteClass,
      createSessionSchedule,
      updateSessionSchedule,
      deleteSessionSchedule,
      openSession,
      closeSession,
      toggleSessionStatus,
      recordAttendance,
      getClassById,
      getScheduleById,
      getAssistantById,
      getAttendanceCount,
      getClassesWithDetails,
      getSessionsWithDetails,
      getSessionAttendanceRecords,
      getPractitioners,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}
