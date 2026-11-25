import { db } from "@/config/firebase";
import { COLLECTIONS, stripUndefined } from "@/services/firestore-service";
import type {
  AttendanceDoc,
  FineDoc,
  Lab,
  LabDoc,
  SessionConfigSnapshot,
  SessionDoc,
  SessionStatus,
  SessionStatusLog,
} from "@/types";
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import {
  requireSessionConfigSnapshot,
  resolveSessionConfigSnapshotOptional,
} from "./session-snapshot-helpers";

export interface OpenSessionWithSnapshotInput {
  sessionId: string;
  labId?: string;
  startAtFallback?: string;
  openedAt: string;
  actorId: string;
  statusLog?: SessionStatusLog;
  configFallback?: SessionConfigSnapshot | null;
}

export interface OpenSessionWithSnapshotResult {
  configSnapshot: SessionConfigSnapshot;
  startAt: string;
  labId?: string;
}

/**
 * Membuka sesi praktikum (`OPEN`) secara atomik di Firestore sambil menyalin
 * `attendanceConfig` dari dokumen `labs/{labId}` ke `sessions/{sessionId}.configSnapshot`.
 * Melempar error eksplisit jika konfigurasi keterlambatan & denda lab belum tersedia.
 */
export async function firestoreOpenSessionWithSnapshot(
  input: OpenSessionWithSnapshotInput
): Promise<OpenSessionWithSnapshotResult> {
  const fallbackStartAt = input.startAtFallback ?? input.openedAt;

  if (!db) {
    const offlineSnapshot = requireSessionConfigSnapshot(null, input.configFallback);
    return {
      configSnapshot: offlineSnapshot,
      startAt: fallbackStartAt,
      labId: input.labId,
    };
  }

  const firestoreDb = db;
  const sessionRef = doc(firestoreDb, COLLECTIONS.SESSIONS, input.sessionId);

  return runTransaction(firestoreDb, async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists()) {
      throw new Error(`Sesi praktikum "${input.sessionId}" tidak ditemukan di Firestore.`);
    }

    const sessionData = sessionSnap.data() as Partial<SessionDoc> & { labId?: string };
    const resolvedLabId = input.labId || sessionData.labId;

    let labData: Partial<Lab & LabDoc> | null = null;
    if (resolvedLabId) {
      const labRef = doc(firestoreDb, COLLECTIONS.LABS, resolvedLabId);
      const labSnap = await transaction.get(labRef);
      if (labSnap.exists()) {
        labData = labSnap.data() as Partial<Lab & LabDoc>;
      }
    }

    const existingOptional = resolveSessionConfigSnapshotOptional(
      labData,
      sessionData.configSnapshot ?? input.configFallback
    );
    const configSnapshot = requireSessionConfigSnapshot(labData, existingOptional);
    const startAt = sessionData.startAt || fallbackStartAt;

    transaction.update(
      sessionRef,
      stripUndefined({
        status: "OPEN" as SessionStatus,
        openedAt: input.openedAt,
        lastUpdatedBy: input.actorId,
        updatedAt: input.openedAt,
        labId: resolvedLabId,
        startAt,
        configSnapshot,
      })
    );

    if (input.statusLog) {
      const logRef = doc(firestoreDb, COLLECTIONS.STATUS_LOGS, input.statusLog.id);
      transaction.set(logRef, stripUndefined(input.statusLog));
    }

    return {
      configSnapshot,
      startAt,
      labId: resolvedLabId,
    };
  });
}

/**
 * Listener real-time (`onSnapshot`) untuk daftar hadir Sprint 4 per sesi.
 */
export function subscribeToSprint4SessionAttendances(
  sessionId: string,
  onData: (items: AttendanceDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  if (!db || !sessionId) return null;

  const q = query(
    collection(db, COLLECTIONS.ATTENDANCES),
    where("sessionId", "==", sessionId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: AttendanceDoc[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as AttendanceDoc);
      });
      onData(items);
    },
    (error) => {
      console.warn(
        `[SessionSnapshotService] Error listening to attendances (${sessionId}):`,
        error
      );
      onError?.(error);
    }
  );
}

/**
 * Listener real-time (`onSnapshot`) untuk daftar tagihan denda (`fines`) per sesi.
 */
export function subscribeToSprint4SessionFines(
  sessionId: string,
  onData: (items: FineDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  if (!db || !sessionId) return null;

  const q = query(
    collection(db, COLLECTIONS.FINES),
    where("sessionId", "==", sessionId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: FineDoc[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as FineDoc);
      });
      onData(items);
    },
    (error) => {
      console.warn(
        `[SessionSnapshotService] Error listening to fines (${sessionId}):`,
        error
      );
      onError?.(error);
    }
  );
}
