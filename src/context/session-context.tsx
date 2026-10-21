import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  users as initialUsers,
  schedules as initialSchedules,
  sessions as initialSessions,
  attendance as initialAttendance,
} from '@/data/dummy';
import type { Attendance, Schedule, Session, SessionStatus, User } from '@/types';

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
  // Helper queries
  getScheduleById: (scheduleId: string) => Schedule | undefined;
  getAssistantById: (assistantId: string) => User | undefined;
  getAttendanceCount: (sessionId: string) => number;
  getSessionsWithDetails: () => SessionWithDetails[];
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [schedules] = useState<Schedule[]>(initialSchedules);
  const [users] = useState<User[]>(initialUsers);
  const [attendance] = useState<Attendance[]>(initialAttendance);
  const [currentAssistantId, setCurrentAssistantId] = useState<string>('user-asisten-001');

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
      getScheduleById,
      getAssistantById,
      getAttendanceCount,
      getSessionsWithDetails,
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
      getScheduleById,
      getAssistantById,
      getAttendanceCount,
      getSessionsWithDetails,
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
