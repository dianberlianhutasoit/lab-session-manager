import { db } from "@/config/firebase";
import { COLLECTIONS, stripUndefined } from "@/services/firestore-service";
import type {
  AttendanceDoc,
  FineDoc,
  LeaveStatus,
  SessionConfigSnapshot,
  SessionDoc,
} from "@/types";
import { doc, runTransaction } from "firebase/firestore";
import { requireSessionConfigSnapshot } from "@/features/asprak/services/session-snapshot-helpers";
import {
  buildAttendanceId,
  buildFineId,
} from "@/features/presensi/fine-rules";
import {
  prepareCheckInWithFine,
  prepareLeaveApprovalEffects,
} from "./attendance-fine-helpers";

export interface CheckInWithFineTransactionInput {
  sessionId: string;
  studentId: string;
  labId?: string;
  checkedInAt: string;
  startAtFallback?: string;
  configFallback?: SessionConfigSnapshot;
}

export interface CheckInWithFineTransactionResult {
  attendanceDoc: AttendanceDoc;
  fineDoc: FineDoc | null;
}

/**
 * Mencatat presensi praktikan (`attendances/{sessionId}_{studentId}`) sekaligus
 * mengevaluasi keterlambatan dan menerbitkan tagihan denda deterministik (`fines/{sessionId}_{studentId}`)
 * di dalam satu transaksi Firestore yang atomik dan idempoten.
 */
export async function firestoreCheckInWithFineTransaction(
  input: CheckInWithFineTransactionInput
): Promise<CheckInWithFineTransactionResult> {
  const fallbackStartAt = input.startAtFallback ?? input.checkedInAt;
  const fallbackLabId = input.labId?.trim() || "lab-default";

  if (!db) {
    const resolvedOfflineConfig = requireSessionConfigSnapshot(
      null,
      input.configFallback
    );
    return prepareCheckInWithFine({
      sessionId: input.sessionId,
      studentId: input.studentId,
      labId: fallbackLabId,
      sessionStartAt: fallbackStartAt,
      checkedInAt: input.checkedInAt,
      configSnapshot: resolvedOfflineConfig,
    });
  }

  const docId = buildAttendanceId(input.sessionId, input.studentId);
  const fineDocId = buildFineId(input.sessionId, input.studentId);
  const sessionRef = doc(db, COLLECTIONS.SESSIONS, input.sessionId);
  const attendanceRef = doc(db, COLLECTIONS.ATTENDANCES, docId);
  const fineRef = doc(db, COLLECTIONS.FINES, fineDocId);

  return runTransaction(db, async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists() || sessionSnap.data()?.status !== "OPEN") {
      throw new Error("Sesi ini sudah ditutup. Presensi tidak dapat dilakukan.");
    }

    const sessionData = sessionSnap.data() as Partial<SessionDoc> & {
      openedAt?: string;
    };

    const existingAttendanceSnap = await transaction.get(attendanceRef);
    const existingAttendance = existingAttendanceSnap.exists()
      ? (existingAttendanceSnap.data() as AttendanceDoc)
      : null;

    if (existingAttendance && existingAttendance.status === "PRESENT") {
      throw new Error("Presensi Anda untuk sesi praktikum ini sudah tercatat sebelumnya.");
    }

    const existingFineSnap = await transaction.get(fineRef);
    const existingFine = existingFineSnap.exists()
      ? ({ id: existingFineSnap.id, ...existingFineSnap.data() } as FineDoc)
      : null;

    const resolvedConfig = requireSessionConfigSnapshot(
      null,
      sessionData.configSnapshot ?? input.configFallback
    );
    const resolvedStartAt =
      sessionData.startAt || sessionData.openedAt || fallbackStartAt;
    const resolvedLabId = sessionData.labId || fallbackLabId;

    const prepared = prepareCheckInWithFine({
      sessionId: input.sessionId,
      studentId: input.studentId,
      labId: resolvedLabId,
      sessionStartAt: resolvedStartAt,
      checkedInAt: input.checkedInAt,
      configSnapshot: resolvedConfig,
      existingFine,
    });

    transaction.set(attendanceRef, stripUndefined(prepared.attendanceDoc));

    if (prepared.fineDoc && !existingFineSnap.exists()) {
      transaction.set(fineRef, stripUndefined(prepared.fineDoc));
    }

    return {
      attendanceDoc: prepared.attendanceDoc,
      fineDoc: prepared.fineDoc ?? existingFine,
    };
  });
}

export interface ReviewLeaveAndWaiveFineInput {
  requestId: string;
  decision: Exclude<LeaveStatus, "PENDING">;
  sessionId: string;
  studentId: string;
  labId?: string;
  metadata: {
    reviewedBy: string;
    reviewedByName: string;
    reviewedAt: string;
    reviewerNote?: string;
  };
}

export interface ReviewLeaveAndWaiveFineResult {
  excusedAttendance: AttendanceDoc | null;
  waivedFine: FineDoc | null;
}

/**
 * Meninjau pengajuan izin praktikan (`APPROVED` / `REJECTED`) di Firestore.
 * Jika disetujui (`APPROVED`), transaksi secara atomik:
 * 1. Mengubah status izin menjadi `APPROVED`.
 * 2. Mencatat/memperbarui `attendances/{sessionId}_{studentId}` menjadi `EXCUSED`.
 * 3. Membebaskan denda (`unpaid` -> `waived`) pada `fines/{sessionId}_{studentId}` bila ada.
 */
export async function firestoreReviewLeaveAndWaiveFineTransaction(
  input: ReviewLeaveAndWaiveFineInput
): Promise<ReviewLeaveAndWaiveFineResult> {
  if (!db) {
    if (input.decision !== "APPROVED") {
      return { excusedAttendance: null, waivedFine: null };
    }
    const effects = prepareLeaveApprovalEffects({
      sessionId: input.sessionId,
      studentId: input.studentId,
      labId: input.labId?.trim() || "lab-default",
      reviewedAt: input.metadata.reviewedAt,
    });
    return {
      excusedAttendance: effects.excusedAttendance,
      waivedFine: effects.fineWaiver?.allowed ? effects.fineWaiver.fine : null,
    };
  }

  const leaveRef = doc(db, COLLECTIONS.LEAVE_REQUESTS, input.requestId);
  const docId = buildAttendanceId(input.sessionId, input.studentId);
  const fineDocId = buildFineId(input.sessionId, input.studentId);
  const attendanceRef = doc(db, COLLECTIONS.ATTENDANCES, docId);
  const fineRef = doc(db, COLLECTIONS.FINES, fineDocId);

  return runTransaction(db, async (transaction) => {
    const leaveSnap = await transaction.get(leaveRef);
    const attendanceSnap =
      input.decision === "APPROVED" ? await transaction.get(attendanceRef) : null;
    const fineSnap =
      input.decision === "APPROVED" ? await transaction.get(fineRef) : null;

    if (leaveSnap.exists()) {
      transaction.update(
        leaveRef,
        stripUndefined({
          status: input.decision,
          reviewedBy: input.metadata.reviewedBy,
          reviewedByName: input.metadata.reviewedByName,
          reviewedAt: input.metadata.reviewedAt,
          reviewerNote: input.metadata.reviewerNote,
        })
      );
    }

    if (input.decision !== "APPROVED") {
      return { excusedAttendance: null, waivedFine: null };
    }

    const existingAttendance = attendanceSnap?.exists()
      ? ({ id: attendanceSnap.id, ...attendanceSnap.data() } as AttendanceDoc)
      : null;
    const existingFine = fineSnap?.exists()
      ? ({ id: fineSnap.id, ...fineSnap.data() } as FineDoc)
      : null;

    const effects = prepareLeaveApprovalEffects({
      sessionId: input.sessionId,
      studentId: input.studentId,
      labId: input.labId?.trim() || existingAttendance?.labId || "lab-default",
      reviewedAt: input.metadata.reviewedAt,
      existingAttendance,
      existingFine,
    });

    transaction.set(attendanceRef, stripUndefined(effects.excusedAttendance));

    let waivedFine: FineDoc | null = null;
    if (effects.fineWaiver?.allowed && fineSnap?.exists()) {
      transaction.update(fineRef, { status: "waived" });
      waivedFine = effects.fineWaiver.fine;
    }

    return {
      excusedAttendance: effects.excusedAttendance,
      waivedFine,
    };
  });
}
