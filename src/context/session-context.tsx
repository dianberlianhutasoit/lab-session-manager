<<<<<<< HEAD
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
  User,
} from '@/types';
import type { LabClassWithDetails } from '@/components/asisten/class-card';
=======
import { collection, doc, documentId, onSnapshot, query, runTransaction, updateDoc, where } from '@react-native-firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { firestore } from '@/services/firebase';
import type { Attendance, AttendanceRecord, Role, Schedule, Session, SessionStatus, User } from '@/types';
>>>>>>> 08159ee2e91b25553ccb9a14adf5343453de15d8

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
<<<<<<< HEAD
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
=======
  loading: boolean;
  error: string | null;
  currentAssistantId: string;
  setCurrentAssistantId: (id: string) => void;
  openSession: (sessionId: string) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
  toggleSessionStatus: (sessionId: string) => Promise<void>;
  recordAttendance: (sessionId: string, userId: string, recordedAt: string) => Promise<boolean>;
>>>>>>> 08159ee2e91b25553ccb9a14adf5343453de15d8
  getScheduleById: (scheduleId: string) => Schedule | undefined;
  getAssistantById: (assistantId: string) => User | undefined;
  getAttendanceCount: (sessionId: string) => number;
  getClassesWithDetails: () => LabClassWithDetails[];
  getSessionsWithDetails: () => SessionWithDetails[];
<<<<<<< HEAD
  // Rekap Presensi Praktikan
=======
>>>>>>> 08159ee2e91b25553ccb9a14adf5343453de15d8
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
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asIso = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return '';
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
<<<<<<< HEAD
  const [classes, setClasses] = useState<LabClass[]>(initialClasses);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
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
=======
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const loading = Boolean(profile && loadedUid !== profile.id);
  const [error, setError] = useState<string | null>(null);
  const [currentAssistantId, setCurrentAssistantId] = useState('');

  useEffect(() => {
    if (!profile) return;
    const readySources = new Set<string>();
    const onReady = (source: string) => { readySources.add(source); if (readySources.size >= 4) setLoadedUid(profile.id); };
    const onFailure = (cause: unknown) => { setError(cause instanceof Error ? cause.message : 'Data tidak dapat dimuat.'); };
    const userCollection = collection(firestore, 'users');
    const userQuery = profile.role === 'asisten' ? userCollection : query(userCollection, where(documentId(), '==', profile.id));
    const stopUsers = onSnapshot(userQuery, (snapshot) => {
      setUsers(snapshot.docs.flatMap((item) => {
        const data = item.data();
        if ((data.role !== 'praktikan' && data.role !== 'asisten') || typeof data.name !== 'string') return [];
        return [{ id: item.id, name: data.name, email: asString(data.email), role: data.role as Role }];
      })); onReady('users');
    }, (cause) => { onFailure(cause); onReady('users'); });
    const stopSchedules = onSnapshot(collection(firestore, 'schedules'), (snapshot) => {
      setSchedules(snapshot.docs.map((item) => {
        const data = item.data();
        return { id: item.id, title: asString(data.title), courseCode: asString(data.courseCode), date: asString(data.date), startTime: asString(data.startTime), endTime: asString(data.endTime), room: asString(data.room) };
      })); onReady('schedules');
    }, (cause) => { onFailure(cause); onReady('schedules'); });
    const stopSessions = onSnapshot(collection(firestore, 'sessions'), (snapshot) => {
      setSessions(snapshot.docs.map((item) => {
        const data = item.data();
        return { id: item.id, scheduleId: asString(data.scheduleId), assistantId: asString(data.assistantId), status: data.status === 'OPEN' ? 'OPEN' : 'CLOSED' };
      })); onReady('sessions');
    }, (cause) => { onFailure(cause); onReady('sessions'); });
    const attendanceCollection = collection(firestore, 'attendance');
    const attendanceQuery = profile.role === 'asisten' ? attendanceCollection : query(attendanceCollection, where('userId', '==', profile.id));
    const stopAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      setAttendance(snapshot.docs.map((item) => {
        const data = item.data();
        return { id: item.id, sessionId: asString(data.sessionId), userId: asString(data.userId), recordedAt: asIso(data.recordedAt) };
      })); onReady('attendance');
    }, (cause) => { onFailure(cause); onReady('attendance'); });
    return () => { stopUsers(); stopSchedules(); stopSessions(); stopAttendance(); };
  }, [profile]);

  const updateStatus = useCallback(async (sessionId: string, status: SessionStatus) => {
    setError(null);
    try { await updateDoc(doc(firestore, 'sessions', sessionId), { status, updatedAt: new Date().toISOString() }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Status sesi gagal diperbarui.'); }
>>>>>>> 08159ee2e91b25553ccb9a14adf5343453de15d8
  }, []);
  const openSession = useCallback((id: string) => updateStatus(id, 'OPEN'), [updateStatus]);
  const closeSession = useCallback((id: string) => updateStatus(id, 'CLOSED'), [updateStatus]);
  const toggleSessionStatus = useCallback((id: string) => {
    const target = sessions.find((item) => item.id === id);
    return target ? updateStatus(id, target.status === 'OPEN' ? 'CLOSED' : 'OPEN') : Promise.resolve();
  }, [sessions, updateStatus]);

<<<<<<< HEAD
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

=======
  const recordAttendance = useCallback(async (sessionId: string, userId: string, recordedAt: string) => {
    const sessionRef = doc(firestore, 'sessions', sessionId);
    const attendanceRef = doc(firestore, 'attendance', `${encodeURIComponent(sessionId)}_${encodeURIComponent(userId)}`);
    return runTransaction(firestore, async (transaction) => {
      const sessionSnapshot = await transaction.get(sessionRef);
      if (!sessionSnapshot.exists() || sessionSnapshot.data()?.status !== 'OPEN') throw new Error('Sesi ini sudah ditutup. Presensi tidak dapat dilakukan.');
      const existing = await transaction.get(attendanceRef);
      if (existing.exists()) return false;
      transaction.set(attendanceRef, { sessionId, userId, recordedAt });
>>>>>>> 08159ee2e91b25553ccb9a14adf5343453de15d8
      return true;
    });
  }, []);

<<<<<<< HEAD
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
      permissions,
      currentStudentId,
      addPermission,
      getPermissionsByUser,
      updatePermissionStatus,
    ]
  );
=======
  const getScheduleById = useCallback((id: string) => schedules.find((item) => item.id === id), [schedules]);
  const getAssistantById = useCallback((id: string) => users.find((item) => item.id === id), [users]);
  const getAttendanceCount = useCallback((id: string) => attendance.filter((item) => item.sessionId === id).length, [attendance]);
  const getSessionsWithDetails = useCallback(() => sessions.map((item) => ({ ...item, schedule: getScheduleById(item.scheduleId), assistant: getAssistantById(item.assistantId), attendanceCount: getAttendanceCount(item.id) })), [sessions, getScheduleById, getAssistantById, getAttendanceCount]);
  const getSessionAttendanceRecords = useCallback((id: string): AttendanceRecord[] => attendance.filter((item) => item.sessionId === id).map((item) => {
    const student = users.find((user) => user.id === item.userId);
    return { ...item, userName: student?.name ?? 'Praktikan Tidak Dikenal', userEmail: student?.email ?? '-' };
  }), [attendance, users]);
  const getPractitioners = useCallback(() => users.filter((user) => user.role === 'praktikan'), [users]);
>>>>>>> 08159ee2e91b25553ccb9a14adf5343453de15d8

  const value = useMemo(() => ({ sessions, schedules, users, attendance, loading, error, currentAssistantId: profile?.role === 'asisten' ? profile.id : currentAssistantId, setCurrentAssistantId, openSession, closeSession, toggleSessionStatus, recordAttendance, getScheduleById, getAssistantById, getAttendanceCount, getSessionsWithDetails, getSessionAttendanceRecords, getPractitioners }), [sessions, schedules, users, attendance, loading, error, profile, currentAssistantId, openSession, closeSession, toggleSessionStatus, recordAttendance, getScheduleById, getAssistantById, getAttendanceCount, getSessionsWithDetails, getSessionAttendanceRecords, getPractitioners]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSessionContext must be used within SessionProvider');
  return context;
}
