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
  statusLogs as initialStatusLogs,
  attendance as initialAttendance,
  permissions as initialPermissions,
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
  firestoreBatchCloseSessions,
  firestoreRecordAttendance,
} from '@/services/firestore-service';
import type {
  Attendance,
  AttendanceRecord,
  LabClass,
  LabClassFormInput,
  Permission,
  PermissionCategory,
  PermissionStatus,
  Schedule,
  Session,
  SessionScheduleFormInput,
  SessionStatus,
  SessionStatusLog,
  User,
} from '@/types';
import type { LabClassWithDetails } from '@/components/asisten/class-card';

export interface SessionWithDetails extends Session {
  schedule?: Schedule;
  assistant?: User;
  lastUpdatedByUser?: User;
  attendanceCount: number;
}

interface SessionContextValue {
  classes: LabClass[];
  sessions: Session[];
  schedules: Schedule[];
  statusLogs: SessionStatusLog[];
  updatingSessionIds: string[];
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
  // SRS-08: Kontrol Status Pembukaan/Penutupan Sesi (OPEN / CLOSED)
  openSession: (sessionId: string, actorAssistantId?: string) => Promise<boolean>;
  closeSession: (sessionId: string, actorAssistantId?: string) => Promise<boolean>;
  toggleSessionStatus: (sessionId: string, actorAssistantId?: string) => Promise<boolean>;
  closeAllOpenSessions: (
    assistantIdFilter?: string,
    actorAssistantId?: string
  ) => Promise<number>;
  isSessionUpdating: (sessionId: string) => boolean;
  getSessionStatusLogs: (sessionId: string) => SessionStatusLog[];
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
  // SRS-11 s/d SRS-13: Pengajuan Izin & Integrasi AI
  permissions: Permission[];
  currentStudentId: string;
  setCurrentStudentId: (id: string) => void;
  addPermission: (data: {
    sessionId: string;
    reason: string;
    category?: PermissionCategory;
    aiAnalysis?: string;
  }) => Permission;
  getPermissionsByUser: (userId: string) => Permission[];
  updatePermissionStatus: (permissionId: string, status: PermissionStatus) => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [classes, setClasses] = useState<LabClass[]>(initialClasses);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [statusLogs, setStatusLogs] = useState<SessionStatusLog[]>(initialStatusLogs);
  const [updatingSessionIds, setUpdatingSessionIds] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [attendance, setAttendance] = useState<Attendance[]>(initialAttendance);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const attendanceRef = useRef<Attendance[]>(initialAttendance);
  const [currentAssistantId, setCurrentAssistantId] = useState<string>('user-asisten-001');
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [currentStudentId, setCurrentStudentId] = useState<string>('user-praktikan-001');

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

    const unsubLogs = subscribeToCollection<SessionStatusLog>(
      COLLECTIONS.STATUS_LOGS,
      (items) => {
        if (items.length > 0) {
          const sorted = [...items].sort((a, b) =>
            b.changedAt.localeCompare(a.changedAt)
          );
          setStatusLogs(sorted);
        }
      }
    );

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
      unsubLogs?.();
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
      const initialStatus = input.status ?? 'CLOSED';

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
        status: initialStatus,
        openedAt: initialStatus === 'OPEN' ? now : undefined,
        lastUpdatedBy: input.assistantId,
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
        lastUpdatedByUser: users.find((u) => u.id === newSession.assistantId),
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
      const nextStatus = input.status ?? existingSession.status;

      const sessionUpdates: Partial<Session> = {
        classId: input.classId,
        assistantId: input.assistantId,
        status: nextStatus,
        openedAt:
          nextStatus === 'OPEN' && existingSession.status !== 'OPEN'
            ? now
            : existingSession.openedAt,
        closedAt:
          nextStatus === 'CLOSED' && existingSession.status === 'OPEN'
            ? now
            : existingSession.closedAt,
        lastUpdatedBy: input.assistantId,
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
      setStatusLogs((prev) => prev.filter((log) => log.sessionId !== sessionId));

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

  // SRS-08: Fungsi inti transisi status sesi dengan audit log, loading state & rollback
  const changeSessionStatus = useCallback(
    async (
      sessionId: string,
      targetStatus: SessionStatus,
      actorAssistantId?: string
    ): Promise<boolean> => {
      const existing = sessions.find((s) => s.id === sessionId);
      if (!existing || existing.status === targetStatus) return false;

      const now = new Date().toISOString();
      const effectiveActorId =
        actorAssistantId && actorAssistantId !== 'ALL'
          ? actorAssistantId
          : existing.assistantId || currentAssistantId;

      const actorUser = users.find((u) => u.id === effectiveActorId);
      const isSubstitute = effectiveActorId !== existing.assistantId;

      const metadata = {
        openedAt: targetStatus === 'OPEN' ? now : existing.openedAt,
        closedAt: targetStatus === 'CLOSED' ? now : existing.closedAt,
        lastUpdatedBy: effectiveActorId,
      };

      const newLog: SessionStatusLog = {
        id: `log-${sessionId}-${Date.now()}`,
        sessionId,
        previousStatus: existing.status,
        newStatus: targetStatus,
        changedBy: effectiveActorId,
        changedByName: actorUser?.name ?? 'Asisten Lab',
        isSubstitute,
        changedAt: now,
      };

      setUpdatingSessionIds((prev) =>
        prev.includes(sessionId) ? prev : [...prev, sessionId]
      );

      // Optimistic UI update
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: targetStatus,
                ...metadata,
                updatedAt: now,
              }
            : s
        )
      );
      setStatusLogs((prev) => [newLog, ...prev]);

      try {
        if (isFirebaseConfigured) {
          await firestoreUpdateSessionStatus(sessionId, targetStatus, metadata, newLog);
        }
        return true;
      } catch (err) {
        // Rollback pada kegagalan Firestore
        console.warn('[SessionContext] Gagal memperbarui status sesi, rollback:', err);
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? existing : s))
        );
        setStatusLogs((prev) => prev.filter((l) => l.id !== newLog.id));
        return false;
      } finally {
        setUpdatingSessionIds((prev) => prev.filter((id) => id !== sessionId));
      }
    },
    [sessions, users, currentAssistantId]
  );

  // SRS-08: Membuka sesi praktikum (CLOSED -> OPEN)
  const openSession = useCallback(
    async (sessionId: string, actorAssistantId?: string): Promise<boolean> => {
      return changeSessionStatus(sessionId, 'OPEN', actorAssistantId);
    },
    [changeSessionStatus]
  );

  // SRS-08: Menutup sesi praktikum (OPEN -> CLOSED)
  const closeSession = useCallback(
    async (sessionId: string, actorAssistantId?: string): Promise<boolean> => {
      return changeSessionStatus(sessionId, 'CLOSED', actorAssistantId);
    },
    [changeSessionStatus]
  );

  // SRS-08: Toggle status sesi praktikum (OPEN <-> CLOSED)
  const toggleSessionStatus = useCallback(
    async (sessionId: string, actorAssistantId?: string): Promise<boolean> => {
      const target = sessions.find((s) => s.id === sessionId);
      if (!target) return false;
      const nextStatus: SessionStatus = target.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      return changeSessionStatus(sessionId, nextStatus, actorAssistantId);
    },
    [sessions, changeSessionStatus]
  );

  // SRS-08: Tutup semua sesi yang sedang OPEN sekaligus (Batch Close)
  const closeAllOpenSessions = useCallback(
    async (
      assistantIdFilter?: string,
      actorAssistantId?: string
    ): Promise<number> => {
      const openTargets = sessions.filter((s) => {
        if (s.status !== 'OPEN') return false;
        if (assistantIdFilter && assistantIdFilter !== 'ALL') {
          return s.assistantId === assistantIdFilter;
        }
        return true;
      });

      if (openTargets.length === 0) return 0;

      const now = new Date().toISOString();
      const targetIds = openTargets.map((s) => s.id);
      const effectiveActorId =
        actorAssistantId && actorAssistantId !== 'ALL'
          ? actorAssistantId
          : currentAssistantId;
      const actorUser = users.find((u) => u.id === effectiveActorId);

      const newLogs: SessionStatusLog[] = openTargets.map((s, idx) => ({
        id: `log-${s.id}-${Date.now()}-${idx}`,
        sessionId: s.id,
        previousStatus: 'OPEN',
        newStatus: 'CLOSED',
        changedBy: effectiveActorId,
        changedByName: actorUser?.name ?? 'Asisten Lab',
        isSubstitute: effectiveActorId !== s.assistantId,
        changedAt: now,
      }));

      setUpdatingSessionIds((prev) => Array.from(new Set([...prev, ...targetIds])));

      const previousSessionsSnapshot = sessions;
      setSessions((prev) =>
        prev.map((s) =>
          targetIds.includes(s.id)
            ? {
                ...s,
                status: 'CLOSED' as SessionStatus,
                closedAt: now,
                lastUpdatedBy: effectiveActorId,
                updatedAt: now,
              }
            : s
        )
      );
      setStatusLogs((prev) => [...newLogs, ...prev]);

      try {
        if (isFirebaseConfigured) {
          await firestoreBatchCloseSessions(
            targetIds,
            now,
            effectiveActorId,
            newLogs
          );
        }
        return targetIds.length;
      } catch (err) {
        console.warn('[SessionContext] Gagal menutup semua sesi, rollback:', err);
        setSessions(previousSessionsSnapshot);
        const logIds = new Set(newLogs.map((l) => l.id));
        setStatusLogs((prev) => prev.filter((l) => !logIds.has(l.id)));
        return 0;
      } finally {
        setUpdatingSessionIds((prev) =>
          prev.filter((id) => !targetIds.includes(id))
        );
      }
    },
    [sessions, users, currentAssistantId]
  );

  const isSessionUpdating = useCallback(
    (sessionId: string) => updatingSessionIds.includes(sessionId),
    [updatingSessionIds]
  );

  const getSessionStatusLogs = useCallback(
    (sessionId: string): SessionStatusLog[] =>
      statusLogs.filter((log) => log.sessionId === sessionId),
    [statusLogs]
  );

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
      lastUpdatedByUser: sess.lastUpdatedBy
        ? getAssistantById(sess.lastUpdatedBy)
        : undefined,
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

  // SRS-11: Mengajukan izin baru
  const addPermission = useCallback(
    (data: {
      sessionId: string;
      reason: string;
      category?: PermissionCategory;
      aiAnalysis?: string;
    }): Permission => {
      const student = users.find((u) => u.id === currentStudentId);
      const newPermission: Permission = {
        id: `permission-${Date.now()}`,
        sessionId: data.sessionId,
        userId: currentStudentId,
        studentName: student?.name ?? 'Praktikan',
        studentEmail: student?.email ?? 'praktikan@example.test',
        reason: data.reason,
        category: data.category ?? 'Unclassified',
        aiAnalysis: data.aiAnalysis,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      setPermissions((prev) => [newPermission, ...prev]);
      return newPermission;
    },
    [currentStudentId, users]
  );

  // SRS-11: Filter riwayat izin milik praktikan tertentu
  const getPermissionsByUser = useCallback(
    (userId: string): Permission[] => {
      return permissions.filter((p) => p.userId === userId);
    },
    [permissions]
  );

  // SRS-10: Memperbarui status izin (APPROVED/REJECTED) oleh asisten
  const updatePermissionStatus = useCallback(
    (permissionId: string, status: PermissionStatus) => {
      setPermissions((prev) =>
        prev.map((p) => (p.id === permissionId ? { ...p, status } : p))
      );
    },
    []
  );

  const value = useMemo(
    () => ({
      classes,
      sessions,
      schedules,
      statusLogs,
      updatingSessionIds,
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
      closeAllOpenSessions,
      isSessionUpdating,
      getSessionStatusLogs,
      recordAttendance,
      getClassById,
      getScheduleById,
      getAssistantById,
      getAttendanceCount,
      getClassesWithDetails,
      getSessionsWithDetails,
      getSessionAttendanceRecords,
      getPractitioners,
      permissions,
      currentStudentId,
      setCurrentStudentId,
      addPermission,
      getPermissionsByUser,
      updatePermissionStatus,
    }),
    [
      classes,
      sessions,
      schedules,
      statusLogs,
      updatingSessionIds,
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
      closeAllOpenSessions,
      isSessionUpdating,
      getSessionStatusLogs,
      recordAttendance,
      getClassById,
      getScheduleById,
      getAssistantById,
      getAttendanceCount,
      getClassesWithDetails,
      getSessionsWithDetails,
      getSessionAttendanceRecords,
      getPractitioners,
      permissions,
      currentStudentId,
      addPermission,
      getPermissionsByUser,
      updatePermissionStatus,
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
