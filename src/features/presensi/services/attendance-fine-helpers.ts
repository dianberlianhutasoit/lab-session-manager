import type {
  AttendanceDoc,
  FineDoc,
  SessionConfigSnapshot,
} from "@/types";
import {
  applyFineWaiver,
  buildAttendanceId,
  createFinePayload,
  type FineWaiverResult,
} from "@/features/presensi/fine-rules";
import { evaluateCheckInLateness } from "@/features/presensi/late-calculation";

export interface PrepareCheckInWithFineInput {
  sessionId: string;
  studentId: string;
  labId: string;
  sessionStartAt: string;
  checkedInAt: string;
  configSnapshot: SessionConfigSnapshot;
  existingFine?: FineDoc | null;
}

export interface PreparedCheckInWithFineResult {
  attendanceDoc: AttendanceDoc;
  fineDoc: FineDoc | null;
}

/**
 * Menyusun dokumen presensi Sprint 4 (`attendances/{sessionId}_{studentId}`)
 * sekaligus mengevaluasi keterlambatan dan membuat tagihan denda deterministik (`fines`)
 * secara idempoten (tidak menimpa jika denda sudah ada).
 */
export function prepareCheckInWithFine(
  input: PrepareCheckInWithFineInput
): PreparedCheckInWithFineResult {
  const lateness = evaluateCheckInLateness(
    input.sessionStartAt,
    input.checkedInAt,
    input.configSnapshot.gracePeriodMinutes
  );

  const deterministicId = buildAttendanceId(input.sessionId, input.studentId);

  const attendanceDoc: AttendanceDoc = {
    id: deterministicId,
    sessionId: input.sessionId.trim(),
    labId: input.labId.trim() || "lab-default",
    studentId: input.studentId.trim(),
    status: "PRESENT",
    checkedInAt: lateness.checkedInAt,
    isLate: lateness.isLate,
    lateMinutes: lateness.lateMinutes,
  };

  const fineDoc = input.existingFine
    ? null
    : createFinePayload({
        sessionId: input.sessionId,
        studentId: input.studentId,
        labId: input.labId.trim() || "lab-default",
        configSnapshot: input.configSnapshot,
        isLate: lateness.isLate,
        lateMinutes: lateness.lateMinutes,
        createdAt: lateness.checkedInAt,
      });

  return {
    attendanceDoc,
    fineDoc,
  };
}

export interface PrepareLeaveApprovalInput {
  sessionId: string;
  studentId: string;
  labId: string;
  reviewedAt: string;
  existingAttendance?: AttendanceDoc | null;
  existingFine?: FineDoc | null;
}

export interface PreparedLeaveApprovalEffects {
  excusedAttendance: AttendanceDoc;
  fineWaiver: FineWaiverResult | null;
}

/**
 * Menyusun efek persetujuan izin praktikan oleh Asprak:
 * 1. Mencatat status kehadiran menjadi `EXCUSED` dengan tetap mempertahankan
 *    riwayat waktu check-in & keterlambatan sebelumnya jika sudah pernah check-in.
 * 2. Membebaskan tagihan denda (`unpaid` -> `waived`) jika ada.
 */
export function prepareLeaveApprovalEffects(
  input: PrepareLeaveApprovalInput
): PreparedLeaveApprovalEffects {
  const deterministicId = buildAttendanceId(input.sessionId, input.studentId);

  const excusedAttendance: AttendanceDoc = input.existingAttendance
    ? {
        ...input.existingAttendance,
        status: "EXCUSED",
      }
    : {
        id: deterministicId,
        sessionId: input.sessionId.trim(),
        labId: input.labId.trim() || "lab-default",
        studentId: input.studentId.trim(),
        status: "EXCUSED",
        checkedInAt: input.reviewedAt,
        isLate: false,
        lateMinutes: 0,
      };

  const fineWaiver = input.existingFine
    ? applyFineWaiver(input.existingFine)
    : null;

  return {
    excusedAttendance,
    fineWaiver,
  };
}
