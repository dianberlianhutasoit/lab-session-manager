import React, { createContext, useContext, useState, useMemo, useCallback, useRef } from 'react';
import {
  users as initialUsers,
  schedules as initialSchedules,
  sessions as initialSessions,
  attendance as initialAttendance,
  permissions as initialPermissions,
} from '@/data/dummy';
import type {
  Attendance,
  AttendanceRecord,
  Permission,
  PermissionCategory,
  PermissionStatus,
  Schedule,
  Session,
  SessionStatus,
  User,
} from '@/types';

export interface SessionWithDetails extends Session {
  schedule?: Schedule;
  assistant?: User;
  attendanceCount: number;
}

interface SessionContextValue {
  sessions: Session[];
  schedules: Schedule[];
  users: User[];
  attendance: Attendance[];
  currentAssistantId: string;
  setCurrentAssistantId: (id: string) => void;
  // SRS-06: Membuka dan menutup sesi praktikum
  openSession: (sessionId: string) => void;
  closeSession: (sessionId: string) => void;
  toggleSessionStatus: (sessionId: string) => void;
  recordAttendance: (sessionId: string, userId: string, recordedAt: string) => boolean;
  // Helper queries
  getScheduleById: (scheduleId: string) => Schedule | undefined;
  getAssistantById: (assistantId: string) => User | undefined;
  getAttendanceCount: (sessionId: string) => number;
  getSessionsWithDetails: () => SessionWithDetails[];
  // SRS-08: Rekap Presensi Praktikan
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
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [schedules] = useState<Schedule[]>(initialSchedules);
  const [users] = useState<User[]>(initialUsers);
  const [attendance, setAttendance] = useState<Attendance[]>(initialAttendance);
  const attendanceRef = useRef<Attendance[]>(initialAttendance);
  const [currentAssistantId, setCurrentAssistantId] = useState<string>('user-asisten-001');
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [currentStudentId, setCurrentStudentId] = useState<string>('user-praktikan-001');

  // SRS-06: Membuka sesi praktikum
  const openSession = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'OPEN' as SessionStatus } : s))
    );
  }, []);

  // SRS-06: Menutup sesi praktikum
  const closeSession = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'CLOSED' as SessionStatus } : s))
    );
  }, []);

  // SRS-06: Toggle status sesi praktikum
  const toggleSessionStatus = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const nextStatus: SessionStatus = s.status === 'OPEN' ? 'CLOSED' : 'OPEN';
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

      const nextAttendance = [
        ...attendanceRef.current,
        {
          id: `attendance-${sessionId}-${userId}`,
          sessionId,
          userId,
          recordedAt,
        },
      ];
      attendanceRef.current = nextAttendance;
      setAttendance(nextAttendance);
      return true;
    },
    []
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

  const getSessionsWithDetails = useCallback((): SessionWithDetails[] => {
    return sessions.map((sess) => ({
      ...sess,
      schedule: getScheduleById(sess.scheduleId),
      assistant: getAssistantById(sess.assistantId),
      attendanceCount: getAttendanceCount(sess.id),
    }));
  }, [sessions, getScheduleById, getAssistantById, getAttendanceCount]);

  // SRS-08: Mengambil seluruh riwayat presensi beserta identitas praktikan pada suatu sesi
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

  // SRS-08: Mengambil daftar praktikan terdaftar
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
      sessions,
      schedules,
      users,
      attendance,
      currentAssistantId,
      setCurrentAssistantId,
      openSession,
      closeSession,
      toggleSessionStatus,
      recordAttendance,
      getScheduleById,
      getAssistantById,
      getAttendanceCount,
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
      sessions,
      schedules,
      users,
      attendance,
      currentAssistantId,
      openSession,
      closeSession,
      toggleSessionStatus,
      recordAttendance,
      getScheduleById,
      getAssistantById,
      getAttendanceCount,
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
