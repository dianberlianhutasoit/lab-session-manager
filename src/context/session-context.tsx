import { collection, doc, documentId, onSnapshot, query, runTransaction, updateDoc, where } from '@react-native-firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { firestore } from '@/services/firebase';
import type { Attendance, AttendanceRecord, Role, Schedule, Session, SessionStatus, User } from '@/types';

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
  loading: boolean;
  error: string | null;
  currentAssistantId: string;
  setCurrentAssistantId: (id: string) => void;
  openSession: (sessionId: string) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
  toggleSessionStatus: (sessionId: string) => Promise<void>;
  recordAttendance: (sessionId: string, userId: string, recordedAt: string) => Promise<boolean>;
  getScheduleById: (scheduleId: string) => Schedule | undefined;
  getAssistantById: (assistantId: string) => User | undefined;
  getAttendanceCount: (sessionId: string) => number;
  getSessionsWithDetails: () => SessionWithDetails[];
  getSessionAttendanceRecords: (sessionId: string) => AttendanceRecord[];
  getPractitioners: () => User[];
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asIso = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return '';
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
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
  }, []);
  const openSession = useCallback((id: string) => updateStatus(id, 'OPEN'), [updateStatus]);
  const closeSession = useCallback((id: string) => updateStatus(id, 'CLOSED'), [updateStatus]);
  const toggleSessionStatus = useCallback((id: string) => {
    const target = sessions.find((item) => item.id === id);
    return target ? updateStatus(id, target.status === 'OPEN' ? 'CLOSED' : 'OPEN') : Promise.resolve();
  }, [sessions, updateStatus]);

  const recordAttendance = useCallback(async (sessionId: string, userId: string, recordedAt: string) => {
    const sessionRef = doc(firestore, 'sessions', sessionId);
    const attendanceRef = doc(firestore, 'attendance', `${encodeURIComponent(sessionId)}_${encodeURIComponent(userId)}`);
    return runTransaction(firestore, async (transaction) => {
      const sessionSnapshot = await transaction.get(sessionRef);
      if (!sessionSnapshot.exists() || sessionSnapshot.data()?.status !== 'OPEN') throw new Error('Sesi ini sudah ditutup. Presensi tidak dapat dilakukan.');
      const existing = await transaction.get(attendanceRef);
      if (existing.exists()) return false;
      transaction.set(attendanceRef, { sessionId, userId, recordedAt });
      return true;
    });
  }, []);

  const getScheduleById = useCallback((id: string) => schedules.find((item) => item.id === id), [schedules]);
  const getAssistantById = useCallback((id: string) => users.find((item) => item.id === id), [users]);
  const getAttendanceCount = useCallback((id: string) => attendance.filter((item) => item.sessionId === id).length, [attendance]);
  const getSessionsWithDetails = useCallback(() => sessions.map((item) => ({ ...item, schedule: getScheduleById(item.scheduleId), assistant: getAssistantById(item.assistantId), attendanceCount: getAttendanceCount(item.id) })), [sessions, getScheduleById, getAssistantById, getAttendanceCount]);
  const getSessionAttendanceRecords = useCallback((id: string): AttendanceRecord[] => attendance.filter((item) => item.sessionId === id).map((item) => {
    const student = users.find((user) => user.id === item.userId);
    return { ...item, userName: student?.name ?? 'Praktikan Tidak Dikenal', userEmail: student?.email ?? '-' };
  }), [attendance, users]);
  const getPractitioners = useCallback(() => users.filter((user) => user.role === 'praktikan'), [users]);

  const value = useMemo(() => ({ sessions, schedules, users, attendance, loading, error, currentAssistantId: profile?.role === 'asisten' ? profile.id : currentAssistantId, setCurrentAssistantId, openSession, closeSession, toggleSessionStatus, recordAttendance, getScheduleById, getAssistantById, getAttendanceCount, getSessionsWithDetails, getSessionAttendanceRecords, getPractitioners }), [sessions, schedules, users, attendance, loading, error, profile, currentAssistantId, openSession, closeSession, toggleSessionStatus, recordAttendance, getScheduleById, getAssistantById, getAttendanceCount, getSessionsWithDetails, getSessionAttendanceRecords, getPractitioners]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSessionContext must be used within SessionProvider');
  return context;
}
