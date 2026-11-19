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
  leaveRequests as initialLeaveRequests,
  permissions as initialPermissions,
  labs as initialLabs,
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
  firestoreReviewLeaveRequest,
  firestoreSubmitLeaveRequest,
  firestoreCreateLab,
  firestoreUpdateLab,
  firestoreDeleteLab,
} from '@/services/firestore-service';
import { sendPushNotification } from '@/services/notification-service';
import { useAuth } from '@/context/auth-context';
import type {
  Attendance,
  AttendanceRecord,
  Lab,
  LabFormInput,
  LabClass,
  LabClassFormInput,
  LeaveCategory,
  LeaveRequest,
  LeaveStatus,
  Permission,
  PermissionCategory,
  PermissionStatus,
  SentimentLabel,
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
  leaveRequests: LeaveRequest[];
  reviewingLeaveIds: string[];
  lastRealtimeSyncAt: string;
  realtimeEventCount: number;
  loading: boolean;
  error: string | null;
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
  // SRS-09 & SRS-10: Rekap Presensi Real-Time (onSnapshot) & Keputusan Izin (APPROVED / REJECTED)
  recordAttendance: (sessionId: string, userId: string, recordedAt: string) => Promise<boolean>;
  reviewLeaveRequest: (
    requestId: string,
    decision: Exclude<LeaveStatus, 'PENDING'>,
    reviewerNote?: string,
    actorAssistantId?: string
  ) => Promise<boolean>;
  getSessionLeaveRequests: (sessionId: string) => LeaveRequest[];
  // Helper queries
  getClassById: (classId: string) => LabClass | undefined;
  getScheduleById: (scheduleId: string) => Schedule | undefined;
  getAssistantById: (assistantId: string) => User | undefined;
  getAttendanceCount: (sessionId: string) => number;
  getClassesWithDetails: () => LabClassWithDetails[];
  getSessionsWithDetails: () => SessionWithDetails[];
  getSessionAttendanceRecords: (sessionId: string) => AttendanceRecord[];
  getPractitioners: () => User[];
  // SRS-11 s/d SRS-13: Pengajuan Izin & Integrasi AI
  permissions: Permission[];
  currentStudentId: string;
  setCurrentStudentId: (id: string) => void;
  addPermission: (data: {
    sessionId: string;
    reason: string;
    sentiment?: SentimentLabel;
    category?: PermissionCategory;
    aiAnalysis?: string;
  }) => Permission;
  getPermissionsByUser: (userId: string) => Permission[];
  updatePermissionStatus: (permissionId: string, status: PermissionStatus) => void;
  // SRS-07 & SRS-10 Sprint 3: Lokasi & Aktivitas Laboratorium
  labs: Lab[];
  createLab: (input: LabFormInput) => Promise<Lab>;
  updateLab: (labId: string, input: Partial<LabFormInput>) => Promise<boolean>;
  deleteLab: (labId: string) => Promise<boolean>;
  getLabById: (labId: string) => Lab | undefined;
  getLabActivity: (labNameOrId: string) => {
    ongoing: { session: Session; schedule: Schedule } | null;
    next: { session: Session; schedule: Schedule } | null;
  };
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  const [classes, setClasses] = useState<LabClass[]>(initialClasses);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [statusLogs, setStatusLogs] = useState<SessionStatusLog[]>(initialStatusLogs);
  const [updatingSessionIds, setUpdatingSessionIds] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [attendance, setAttendance] = useState<Attendance[]>(initialAttendance);
  const [labs, setLabs] = useState<Lab[]>(initialLabs);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [reviewingLeaveIds, setReviewingLeaveIds] = useState<string[]>([]);
  const [lastRealtimeSyncAt, setLastRealtimeSyncAt] = useState<string>(
    () => new Date().toISOString()
  );
  const [realtimeEventCount, setRealtimeEventCount] = useState<number>(1);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(() => isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const attendanceRef = useRef<Attendance[]>(initialAttendance);
  const [currentAssistantId, setCurrentAssistantId] = useState<string>('user-asisten-001');
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [currentStudentId, setCurrentStudentId] = useState<string>('user-praktikan-001');

  // Sinkronisasi dengan user profile yang login jika ada
  useEffect(() => {
    if (!profile) return;
    Promise.resolve().then(() => {
      if (profile.role === 'asisten') {
        setCurrentAssistantId(profile.id);
      } else if (profile.role === 'praktikan') {
        setCurrentStudentId(profile.id);
      }
    });
  }, [profile]);

  useEffect(() => {
    attendanceRef.current = attendance;
  }, [attendance]);

  const markRealtimeSync = useCallback(() => {
    setLastRealtimeSyncAt(new Date().toISOString());
    setRealtimeEventCount((prev) => prev + 1);
  }, []);

  // SRS-09: Sinkronisasi real-time berbasis onSnapshot dengan Firebase Firestore
  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }

    let isMounted = true;
    seedInitialFirestoreDataIfEmpty()
      .then(() => {
        if (isMounted) {
          setIsFirestoreConnected(true);
        }
      })
      .catch((err) => {
        console.warn('[SessionContext] Gagal inisialisasi Firestore:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const unsubClasses = subscribeToCollection<LabClass>(COLLECTIONS.CLASSES, (items) => {
      if (items.length > 0) setClasses(items);
    });

    const unsubSchedules = subscribeToCollection<Schedule>(COLLECTIONS.SCHEDULES, (items) => {
      if (items.length > 0) setSchedules(items);
    });

    const unsubSessions = subscribeToCollection<Session>(COLLECTIONS.SESSIONS, (items) => {
      if (items.length > 0) {
        setSessions(items);
        markRealtimeSync();
      }
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
      markRealtimeSync();
    });

    const unsubLeaves = subscribeToCollection<LeaveRequest>(
      COLLECTIONS.LEAVE_REQUESTS,
      (items) => {
        if (items.length > 0) {
          const sorted = [...items].sort((a, b) =>
            b.submittedAt.localeCompare(a.submittedAt)
          );
          setLeaveRequests(sorted);

          // Sinkronisasi real-time ke model permissions agar antarmuka riwayat praktikan ter-update otomatis
          const mappedPermissions: Permission[] = sorted.map((req) => ({
            id: req.id,
            sessionId: req.sessionId,
            userId: req.userId,
            studentName: req.userName,
            studentEmail: req.userEmail,
            reason: req.reason,
            sentiment: req.sentiment,
            category: req.category as PermissionCategory,
            aiAnalysis: req.aiAnalysis,
            status: req.status,
            createdAt: req.submittedAt,
          }));
          setPermissions(mappedPermissions);

          markRealtimeSync();
        }
      }
    );

    const unsubUsers = subscribeToCollection<User>(COLLECTIONS.USERS, (items) => {
      if (items.length > 0) setUsers(items);
    });

    const unsubLabs = subscribeToCollection<Lab>(COLLECTIONS.LABS, (items) => {
      if (items.length > 0) {
        setLabs(items);
        markRealtimeSync();
      }
    });

    return () => {
      isMounted = false;
      unsubClasses?.();
      unsubSchedules?.();
      unsubSessions?.();
      unsubLogs?.();
      unsubAttendance?.();
      unsubLeaves?.();
      unsubUsers?.();
      unsubLabs?.();
    };
  }, [markRealtimeSync]);

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
      markRealtimeSync();

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
    [users, markRealtimeSync]
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
      markRealtimeSync();

      if (isFirebaseConfigured) {
        await firestoreUpdateSessionAndSchedule(
          sessionId,
          scheduleId,
          sessionUpdates,
          scheduleUpdates
        );
      }

      // SRS-15: Pemicu push notification saat jadwal sesi diperbarui
      const courseTitle = input.title.trim() || 'Praktikum';
      const formattedTime = `${input.date.trim()} (${input.startTime.trim()} - ${input.endTime.trim()})`;
      const targetTokens = users
        .filter(
          (u) =>
            u.role === 'praktikan' &&
            typeof u.expoPushToken === 'string' &&
            u.expoPushToken.trim().length > 0
        )
        .map((u) => u.expoPushToken as string);

      if (targetTokens.length > 0) {
        void sendPushNotification({
          to: targetTokens,
          title: '📅 Jadwal Praktikum Diperbarui',
          body: `Jadwal sesi ${courseTitle} telah diperbarui ke ${formattedTime} di ${input.room.trim()}.`,
          data: {
            screen: `/praktikan/${sessionId}`,
            sessionId,
            type: 'SCHEDULE_UPDATED',
          },
        });
      }

      return true;
    },
    [sessions, users, markRealtimeSync]
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
      setLeaveRequests((prev) => prev.filter((l) => l.sessionId !== sessionId));
      setStatusLogs((prev) => prev.filter((log) => log.sessionId !== sessionId));
      markRealtimeSync();

      if (isFirebaseConfigured) {
        await firestoreDeleteSessionAndSchedule(
          sessionId,
          scheduleId,
          relatedAttendanceIds
        );
      }

      return true;
    },
    [sessions, attendance, markRealtimeSync]
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
      markRealtimeSync();

      try {
        if (isFirebaseConfigured) {
          await firestoreUpdateSessionStatus(sessionId, targetStatus, metadata, newLog);
        }

        // SRS-15: Pemicu push notification saat sesi praktikum dibuka
        if (targetStatus === 'OPEN' && existing.status !== 'OPEN') {
          const sessionSchedule = schedules.find((s) => s.id === existing.scheduleId);
          const sessionClass = classes.find((c) => c.id === existing.classId);
          const courseTitle = sessionClass?.title ?? sessionSchedule?.title ?? 'Praktikum';

          const targetTokens = users
            .filter(
              (u) =>
                u.role === 'praktikan' &&
                typeof u.expoPushToken === 'string' &&
                u.expoPushToken.trim().length > 0
            )
            .map((u) => u.expoPushToken as string);

          if (targetTokens.length > 0) {
            void sendPushNotification({
              to: targetTokens,
              title: '🟢 Sesi Praktikum Dibuka!',
              body: `Sesi praktikum ${courseTitle} telah dibuka. Silakan lakukan presensi sekarang.`,
              data: {
                screen: `/praktikan/${sessionId}`,
                sessionId,
                type: 'SESSION_OPENED',
              },
            });
          }
        }

        return true;
      } catch (err) {
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
    [sessions, schedules, classes, users, currentAssistantId, markRealtimeSync]
  );

  const openSession = useCallback(
    async (sessionId: string, actorAssistantId?: string): Promise<boolean> => {
      return changeSessionStatus(sessionId, 'OPEN', actorAssistantId);
    },
    [changeSessionStatus]
  );

  const closeSession = useCallback(
    async (sessionId: string, actorAssistantId?: string): Promise<boolean> => {
      return changeSessionStatus(sessionId, 'CLOSED', actorAssistantId);
    },
    [changeSessionStatus]
  );

  const toggleSessionStatus = useCallback(
    async (sessionId: string, actorAssistantId?: string): Promise<boolean> => {
      const target = sessions.find((s) => s.id === sessionId);
      if (!target) return false;
      const nextStatus: SessionStatus = target.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      return changeSessionStatus(sessionId, nextStatus, actorAssistantId);
    },
    [sessions, changeSessionStatus]
  );

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
      markRealtimeSync();

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
    [sessions, users, currentAssistantId, markRealtimeSync]
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

  // SRS-09: Mencatat presensi & memicu event pembaruan real-time
  const recordAttendance = useCallback(
    async (sessionId: string, userId: string, recordedAt: string): Promise<boolean> => {
      const targetSession = sessions.find((s) => s.id === sessionId);
      if (targetSession && targetSession.status !== 'OPEN') {
        throw new Error('Sesi ini sudah ditutup. Presensi tidak dapat dilakukan.');
      }

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
      markRealtimeSync();

      if (isFirebaseConfigured) {
        await firestoreRecordAttendance(newRecord);
      }

      return true;
    },
    [sessions, markRealtimeSync]
  );

  // SRS-10: Meninjau dan memberikan keputusan izin praktikan (APPROVED / REJECTED)
  const reviewLeaveRequest = useCallback(
    async (
      requestId: string,
      decision: Exclude<LeaveStatus, 'PENDING'>,
      reviewerNote?: string,
      actorAssistantId?: string
    ): Promise<boolean> => {
      const existing = leaveRequests.find((l) => l.id === requestId);
      if (!existing) return false;

      const now = new Date().toISOString();
      const sessionOfRequest = sessions.find((s) => s.id === existing.sessionId);
      const effectiveActorId =
        actorAssistantId && actorAssistantId !== 'ALL'
          ? actorAssistantId
          : sessionOfRequest?.assistantId || currentAssistantId;

      const reviewerUser = users.find((u) => u.id === effectiveActorId);
      const trimmedNote = reviewerNote?.trim() || undefined;

      const metadata = {
        reviewedBy: effectiveActorId,
        reviewedByName: reviewerUser?.name ?? 'Asisten Lab',
        reviewedAt: now,
        reviewerNote: trimmedNote,
      };

      setReviewingLeaveIds((prev) =>
        prev.includes(requestId) ? prev : [...prev, requestId]
      );

      setLeaveRequests((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status: decision,
                ...metadata,
              }
            : item
        )
      );
      setPermissions((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status: decision,
              }
            : item
        )
      );
      markRealtimeSync();

      try {
        if (isFirebaseConfigured) {
          await firestoreReviewLeaveRequest(requestId, decision, metadata);
        }

        // SRS-16: Pemicu push notification saat keputusan izin (APPROVED / REJECTED)
        const targetStudent = users.find((u) => u.id === existing.userId);
        if (
          targetStudent &&
          typeof targetStudent.expoPushToken === 'string' &&
          targetStudent.expoPushToken.trim().length > 0
        ) {
          const relatedSession = sessions.find((s) => s.id === existing.sessionId);
          const relatedSchedule = schedules.find((sch) => sch.id === relatedSession?.scheduleId);
          const courseTitle = relatedSchedule?.title ?? 'Praktikum';
          const isApproved = decision === 'APPROVED';
          const decisionText = isApproved ? 'disetujui' : 'ditolak';
          const noteText = trimmedNote ? ` Catatan: "${trimmedNote}"` : '';

          void sendPushNotification({
            to: targetStudent.expoPushToken,
            title: isApproved ? '✅ Pengajuan Izin Disetujui' : '❌ Pengajuan Izin Ditolak',
            body: `Pengajuan izin Anda untuk praktikum ${courseTitle} telah ${decisionText}.${noteText}`,
            data: {
              screen: '/praktikan/izin',
              requestId,
              decision,
              type: 'LEAVE_DECISION',
            },
          });
        }

        return true;
      } catch (err) {
        console.warn('[SessionContext] Gagal memperbarui keputusan izin, rollback:', err);
        setLeaveRequests((prev) =>
          prev.map((item) => (item.id === requestId ? existing : item))
        );
        return false;
      } finally {
        setReviewingLeaveIds((prev) => prev.filter((id) => id !== requestId));
      }
    },
    [leaveRequests, sessions, schedules, users, currentAssistantId, markRealtimeSync]
  );

  const getSessionLeaveRequests = useCallback(
    (sessionId: string): LeaveRequest[] =>
      leaveRequests.filter((l) => l.sessionId === sessionId),
    [leaveRequests]
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

  // Mengambil seluruh riwayat presensi beserta identitas praktikan pada suatu sesi (terurut waktu terbaru)
  const getSessionAttendanceRecords = useCallback(
    (sessionId: string): AttendanceRecord[] => {
      const records = attendance.filter((a) => a.sessionId === sessionId);
      return records
        .map((rec) => {
          const student = users.find((u) => u.id === rec.userId);
          return {
            id: rec.id,
            sessionId: rec.sessionId,
            userId: rec.userId,
            userName: student?.name ?? 'Praktikan Tidak Dikenal',
            userEmail: student?.email ?? '-',
            recordedAt: rec.recordedAt,
          };
        })
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    },
    [attendance, users]
  );

  const getPractitioners = useCallback((): User[] => {
    return users.filter((u) => u.role === 'praktikan');
  }, [users]);

  // Mengajukan izin baru dengan analisis AI sentimen dan persistensi Firestore
  const addPermission = useCallback(
    (data: {
      sessionId: string;
      reason: string;
      sentiment?: SentimentLabel;
      category?: PermissionCategory;
      aiAnalysis?: string;
    }): Permission => {
      const student = users.find((u) => u.id === currentStudentId);
      const now = new Date().toISOString();
      const requestId = `leave-${data.sessionId}-${currentStudentId}-${Date.now()}`;

      const newPermission: Permission = {
        id: requestId,
        sessionId: data.sessionId,
        userId: currentStudentId,
        studentName: student?.name ?? 'Praktikan',
        studentEmail: student?.email ?? 'praktikan@example.test',
        reason: data.reason,
        sentiment: data.sentiment,
        category: data.category,
        aiAnalysis: data.aiAnalysis,
        status: 'PENDING',
        createdAt: now,
      };

      const newLeaveRequest: LeaveRequest = {
        id: requestId,
        sessionId: data.sessionId,
        userId: currentStudentId,
        userName: student?.name ?? 'Praktikan',
        userEmail: student?.email ?? 'praktikan@example.test',
        category: (data.category as LeaveCategory) || 'LAINNYA',
        reason: data.reason,
        status: 'PENDING',
        submittedAt: now,
        sentiment: data.sentiment,
        aiAnalysis: data.aiAnalysis,
      };

      setPermissions((prev) => [newPermission, ...prev]);
      setLeaveRequests((prev) => [newLeaveRequest, ...prev]);
      markRealtimeSync();

      if (isFirebaseConfigured) {
        firestoreSubmitLeaveRequest(newLeaveRequest).catch((err) => {
          console.warn('[SessionContext] Gagal menyimpan izin ke Firestore:', err);
        });
      }

      return newPermission;
    },
    [currentStudentId, users, markRealtimeSync]
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
      setLeaveRequests((prev) =>
        prev.map((l) => (l.id === permissionId ? { ...l, status } : l))
      );
    },
    []
  );

  // SRS-07 Sprint 3: Pengelolaan Lokasi Laboratorium (CRUD Labs)
  const createLab = useCallback(
    async (input: LabFormInput): Promise<Lab> => {
      if (!input.name || input.name.trim().length === 0) {
        throw new Error('Nama laboratorium wajib diisi.');
      }
      const lat = Number(input.latitude);
      const lng = Number(input.longitude);
      const rad = Number(input.radius);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new Error('Latitude harus berupa angka antara -90 dan 90.');
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new Error('Longitude harus berupa angka antara -180 dan 180.');
      }
      if (isNaN(rad) || rad <= 0) {
        throw new Error('Radius presensi harus berupa angka positif.');
      }

      const now = new Date().toISOString();
      const newLab: Lab = {
        id: `lab-${Date.now()}`,
        name: input.name.trim(),
        code: input.code?.trim().toUpperCase(),
        building: input.building?.trim() || 'Gedung Fasilkom',
        latitude: lat,
        longitude: lng,
        radius: rad,
        capacity: input.capacity ? Number(input.capacity) : undefined,
        description: input.description?.trim(),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      setLabs((prev) => [newLab, ...prev]);
      markRealtimeSync();

      if (isFirebaseConfigured) {
        await firestoreCreateLab(newLab);
      }

      return newLab;
    },
    [markRealtimeSync]
  );

  const updateLab = useCallback(
    async (labId: string, input: Partial<LabFormInput>): Promise<boolean> => {
      if (input.latitude !== undefined) {
        const lat = Number(input.latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          throw new Error('Latitude harus antara -90 dan 90.');
        }
      }
      if (input.longitude !== undefined) {
        const lng = Number(input.longitude);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          throw new Error('Longitude harus antara -180 dan 180.');
        }
      }
      if (input.radius !== undefined) {
        const rad = Number(input.radius);
        if (isNaN(rad) || rad <= 0) {
          throw new Error('Radius presensi harus lebih dari 0 meter.');
        }
      }

      const now = new Date().toISOString();
      setLabs((prev) =>
        prev.map((l) => (l.id === labId ? { ...l, ...input, updatedAt: now } : l))
      );
      markRealtimeSync();

      if (isFirebaseConfigured) {
        await firestoreUpdateLab(labId, { ...input, updatedAt: now });
      }

      return true;
    },
    [markRealtimeSync]
  );

  const deleteLab = useCallback(
    async (labId: string): Promise<boolean> => {
      setLabs((prev) => prev.filter((l) => l.id !== labId));
      markRealtimeSync();

      if (isFirebaseConfigured) {
        await firestoreDeleteLab(labId);
      }

      return true;
    },
    [markRealtimeSync]
  );

  const getLabById = useCallback(
    (labId: string): Lab | undefined => {
      return labs.find((l) => l.id === labId);
    },
    [labs]
  );

  // SRS-10 & SRS-11: Aktivitas Laboratorium Real-time (Sesi Berlangsung & Berikutnya)
  const getLabActivity = useCallback(
    (labNameOrId: string) => {
      const targetLab = labs.find(
        (l) => l.id === labNameOrId || l.name.toLowerCase() === labNameOrId.toLowerCase()
      );
      const targetName = targetLab ? targetLab.name.toLowerCase().trim() : labNameOrId.toLowerCase().trim();

      const labSchedules = schedules.filter(
        (s) => s.room && s.room.toLowerCase().trim() === targetName
      );

      const labItems = labSchedules
        .map((sch) => {
          const sess = sessions.find((s) => s.scheduleId === sch.id);
          return sess ? { schedule: sch, session: sess } : null;
        })
        .filter((item): item is { schedule: Schedule; session: Session } => item !== null);

      // 1. Sesi Ongoing: Prioritaskan status 'OPEN'
      let ongoing = labItems.find((item) => item.session.status === 'OPEN') || null;

      if (!ongoing) {
        const now = new Date();
        const currentHours = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        ongoing =
          labItems.find(
            (item) =>
              item.schedule.startTime <= currentHours && item.schedule.endTime >= currentHours
          ) || null;
      }

      // 2. Sesi Berikutnya: Sesi mendatang
      const now = new Date();
      const currentHours = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const ongoingId = ongoing?.session.id;

      const upcomingItems = labItems
        .filter((item) => item.session.id !== ongoingId)
        .filter((item) => {
          if (ongoing) {
            return item.schedule.startTime >= ongoing.schedule.endTime;
          }
          return item.schedule.startTime > currentHours;
        })
        .sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));

      const next = upcomingItems.length > 0 ? upcomingItems[0] : (labItems.find((i) => i.session.id !== ongoingId) || null);

      return {
        ongoing,
        next,
      };
    },
    [labs, schedules, sessions]
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
      leaveRequests,
      reviewingLeaveIds,
      lastRealtimeSyncAt,
      realtimeEventCount,
      loading,
      error,
      isFirestoreConnected,
      currentAssistantId: profile?.role === 'asisten' ? profile.id : currentAssistantId,
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
      reviewLeaveRequest,
      getSessionLeaveRequests,
      getClassById,
      getScheduleById,
      getAssistantById,
      getAttendanceCount,
      getClassesWithDetails,
      getSessionsWithDetails,
      getSessionAttendanceRecords,
      getPractitioners,
      permissions,
      currentStudentId: profile?.role === 'praktikan' ? profile.id : currentStudentId,
      setCurrentStudentId,
      addPermission,
      getPermissionsByUser,
      updatePermissionStatus,
      labs,
      createLab,
      updateLab,
      deleteLab,
      getLabById,
      getLabActivity,
    }),
    [
      classes,
      sessions,
      schedules,
      statusLogs,
      updatingSessionIds,
      users,
      attendance,
      leaveRequests,
      reviewingLeaveIds,
      lastRealtimeSyncAt,
      realtimeEventCount,
      loading,
      error,
      isFirestoreConnected,
      profile,
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
      reviewLeaveRequest,
      getSessionLeaveRequests,
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
      labs,
      createLab,
      updateLab,
      deleteLab,
      getLabById,
      getLabActivity,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSessionContext must be used within SessionProvider');
  return context;
}
