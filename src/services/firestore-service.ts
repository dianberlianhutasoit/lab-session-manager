import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  classes as initialClasses,
  schedules as initialSchedules,
  sessions as initialSessions,
  statusLogs as initialStatusLogs,
  attendance as initialAttendance,
  users as initialUsers,
} from '@/data/dummy';
import type {
  Attendance,
  LabClass,
  Schedule,
  Session,
  SessionStatus,
  SessionStatusLog,
} from '@/types';

export const COLLECTIONS = {
  CLASSES: 'classes',
  SCHEDULES: 'schedules',
  SESSIONS: 'sessions',
  STATUS_LOGS: 'session_status_logs',
  ATTENDANCE: 'attendance',
  USERS: 'users',
} as const;

/**
 * Menghapus properti bernilai undefined agar aman dikirim ke Firestore
 */
function stripUndefined<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Berlangganan perubahan koleksi secara real-time dari Firestore
 */
export function subscribeToCollection<T>(
  collectionName: string,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  if (!db) return null;

  const colRef = collection(db, collectionName);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as T);
      });
      onData(items);
    },
    (error) => {
      console.warn(`[Firestore] Error listening to ${collectionName}:`, error);
      onError?.(error);
    }
  );
}

/**
 * Seed data awal ke Firestore jika koleksi classes & sessions masih kosong
 */
export async function seedInitialFirestoreDataIfEmpty(): Promise<void> {
  if (!db) return;

  try {
    const classesSnap = await getDocs(collection(db, COLLECTIONS.CLASSES));
    const sessionsSnap = await getDocs(collection(db, COLLECTIONS.SESSIONS));

    if (!classesSnap.empty || !sessionsSnap.empty) {
      return;
    }

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    for (const u of initialUsers) {
      batch.set(doc(db, COLLECTIONS.USERS, u.id), stripUndefined(u));
    }

    for (const cls of initialClasses) {
      batch.set(
        doc(db, COLLECTIONS.CLASSES, cls.id),
        stripUndefined({ ...cls, createdAt: now, updatedAt: now })
      );
    }

    for (const sch of initialSchedules) {
      batch.set(doc(db, COLLECTIONS.SCHEDULES, sch.id), stripUndefined(sch));
    }

    for (const sess of initialSessions) {
      batch.set(
        doc(db, COLLECTIONS.SESSIONS, sess.id),
        stripUndefined({ ...sess, createdAt: now, updatedAt: now })
      );
    }

    for (const log of initialStatusLogs) {
      batch.set(doc(db, COLLECTIONS.STATUS_LOGS, log.id), stripUndefined(log));
    }

    for (const att of initialAttendance) {
      batch.set(doc(db, COLLECTIONS.ATTENDANCE, att.id), stripUndefined(att));
    }

    await batch.commit();
  } catch (error) {
    console.warn('[Firestore] Gagal melakukan seed data awal:', error);
  }
}

/**
 * SRS-07: Create Kelas Praktikum di Firestore (collection: classes)
 */
export async function firestoreCreateClass(labClass: LabClass): Promise<void> {
  if (!db) return;
  const now = new Date().toISOString();
  await setDoc(
    doc(db, COLLECTIONS.CLASSES, labClass.id),
    stripUndefined({
      ...labClass,
      createdAt: labClass.createdAt ?? now,
      updatedAt: now,
    })
  );
}

/**
 * SRS-07: Update Kelas Praktikum & sinkronisasi ke jadwal terkait di Firestore
 */
export async function firestoreUpdateClass(
  classId: string,
  updates: Partial<LabClass>,
  relatedScheduleIds: string[]
): Promise<void> {
  if (!db) return;
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  batch.update(
    doc(db, COLLECTIONS.CLASSES, classId),
    stripUndefined({
      ...updates,
      updatedAt: now,
    })
  );

  const scheduleSyncPayload = stripUndefined({
    courseCode: updates.courseCode,
    title: updates.title,
    className: updates.className,
  });

  if (Object.keys(scheduleSyncPayload).length > 0) {
    for (const scheduleId of relatedScheduleIds) {
      batch.update(doc(db, COLLECTIONS.SCHEDULES, scheduleId), scheduleSyncPayload);
    }
  }

  await batch.commit();
}

/**
 * SRS-07: Delete Kelas Praktikum di Firestore (collection: classes)
 */
export async function firestoreDeleteClass(classId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, COLLECTIONS.CLASSES, classId));
}

/**
 * SRS-07: Create Jadwal & Sesi Praktikum secara atomik di Firestore (collections: schedules & sessions)
 */
export async function firestoreCreateSessionAndSchedule(
  schedule: Schedule,
  session: Session
): Promise<void> {
  if (!db) return;
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  batch.set(doc(db, COLLECTIONS.SCHEDULES, schedule.id), stripUndefined(schedule));
  batch.set(
    doc(db, COLLECTIONS.SESSIONS, session.id),
    stripUndefined({
      ...session,
      createdAt: session.createdAt ?? now,
      updatedAt: now,
    })
  );

  await batch.commit();
}

/**
 * SRS-07: Update Jadwal & Sesi Praktikum secara atomik di Firestore
 */
export async function firestoreUpdateSessionAndSchedule(
  sessionId: string,
  scheduleId: string,
  sessionUpdates: Partial<Session>,
  scheduleUpdates: Partial<Schedule>
): Promise<void> {
  if (!db) return;
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  batch.update(
    doc(db, COLLECTIONS.SESSIONS, sessionId),
    stripUndefined({
      ...sessionUpdates,
      updatedAt: now,
    })
  );

  batch.update(
    doc(db, COLLECTIONS.SCHEDULES, scheduleId),
    stripUndefined(scheduleUpdates)
  );

  await batch.commit();
}

/**
 * SRS-07: Delete Jadwal & Sesi Praktikum beserta presensi terkait di Firestore
 */
export async function firestoreDeleteSessionAndSchedule(
  sessionId: string,
  scheduleId: string,
  attendanceIds: string[]
): Promise<void> {
  if (!db) return;
  const batch = writeBatch(db);

  batch.delete(doc(db, COLLECTIONS.SESSIONS, sessionId));
  if (scheduleId) {
    batch.delete(doc(db, COLLECTIONS.SCHEDULES, scheduleId));
  }
  for (const attId of attendanceIds) {
    batch.delete(doc(db, COLLECTIONS.ATTENDANCE, attId));
  }

  await batch.commit();
}

/**
 * SRS-08: Update status sesi (OPEN / CLOSED) beserta metadata waktu & log audit di Firestore
 */
export async function firestoreUpdateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  metadata?: {
    openedAt?: string;
    closedAt?: string;
    lastUpdatedBy?: string;
  },
  statusLog?: SessionStatusLog
): Promise<void> {
  if (!db) return;
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  batch.update(
    doc(db, COLLECTIONS.SESSIONS, sessionId),
    stripUndefined({
      status,
      openedAt: metadata?.openedAt,
      closedAt: metadata?.closedAt,
      lastUpdatedBy: metadata?.lastUpdatedBy,
      updatedAt: now,
    })
  );

  if (statusLog) {
    batch.set(doc(db, COLLECTIONS.STATUS_LOGS, statusLog.id), stripUndefined(statusLog));
  }

  await batch.commit();
}

/**
 * SRS-08: Menutup beberapa sesi terbuka sekaligus secara atomik (Batch Close)
 */
export async function firestoreBatchCloseSessions(
  sessionIds: string[],
  closedAt: string,
  lastUpdatedBy: string,
  logs: SessionStatusLog[]
): Promise<void> {
  if (!db || sessionIds.length === 0) return;
  const batch = writeBatch(db);

  for (const sessionId of sessionIds) {
    batch.update(
      doc(db, COLLECTIONS.SESSIONS, sessionId),
      stripUndefined({
        status: 'CLOSED' as SessionStatus,
        closedAt,
        lastUpdatedBy,
        updatedAt: closedAt,
      })
    );
  }

  for (const log of logs) {
    batch.set(doc(db, COLLECTIONS.STATUS_LOGS, log.id), stripUndefined(log));
  }

  await batch.commit();
}

/**
 * Catat presensi praktikan di Firestore
 */
export async function firestoreRecordAttendance(record: Attendance): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, COLLECTIONS.ATTENDANCE, record.id), stripUndefined(record));
}
