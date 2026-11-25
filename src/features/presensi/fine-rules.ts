import type { FineDoc, SessionConfigSnapshot } from "@/types";

export interface CreateFineInput {
  sessionId: string;
  studentId: string;
  labId: string;
  configSnapshot: SessionConfigSnapshot;
  isLate: boolean;
  lateMinutes: number;
  createdAt?: string;
}

export interface FineWaiverResult {
  allowed: boolean;
  fine: FineDoc;
  reason: string;
}

/**
 * Membentuk ID deterministik sesuai kontrak skema Sprint 4:
 * `{sessionId}_{studentId}`.
 */
export function buildDeterministicId(sessionId: string, studentId: string): string {
  const normalizedSessionId = sessionId.trim();
  const normalizedStudentId = studentId.trim();

  if (!normalizedSessionId) {
    throw new Error("sessionId wajib diisi untuk membentuk ID deterministik.");
  }
  if (!normalizedStudentId) {
    throw new Error("studentId wajib diisi untuk membentuk ID deterministik.");
  }

  return `${normalizedSessionId}_${normalizedStudentId}`;
}

/**
 * ID deterministik dokumen koleksi `attendances`.
 */
export function buildAttendanceId(sessionId: string, studentId: string): string {
  return buildDeterministicId(sessionId, studentId);
}

/**
 * ID deterministik dokumen koleksi `fines`.
 */
export function buildFineId(sessionId: string, studentId: string): string {
  return buildDeterministicId(sessionId, studentId);
}

/**
 * Membentuk payload tagihan denda (`FineDoc`) secara pure tanpa akses Firestore.
 * - Mengembalikan `null` jika praktikan tepat waktu (`!isLate` atau `lateMinutes <= 0`).
 * - Mengembalikan `null` jika nominal denda pada snapshot bernilai `0`.
 */
export function createFinePayload(input: CreateFineInput): FineDoc | null {
  const fineAmount = input.configSnapshot.lateFineAmount;
  if (!Number.isFinite(fineAmount) || fineAmount < 0) {
    throw new Error("Nominal denda pada configSnapshot tidak valid.");
  }

  if (!input.isLate || !Number.isFinite(input.lateMinutes) || input.lateMinutes <= 0) {
    return null;
  }

  if (fineAmount === 0) {
    return null;
  }

  const normalizedLabId = input.labId.trim();
  if (!normalizedLabId) {
    throw new Error("labId wajib diisi saat membuat tagihan denda.");
  }

  const resolvedMinutes = Math.ceil(input.lateMinutes);
  const createdAt = input.createdAt?.trim() || new Date().toISOString();
  if (!Number.isFinite(Date.parse(createdAt))) {
    throw new Error("createdAt pada payload denda tidak valid.");
  }

  return {
    id: buildFineId(input.sessionId, input.studentId),
    studentId: input.studentId.trim(),
    sessionId: input.sessionId.trim(),
    labId: normalizedLabId,
    amount: fineAmount,
    reason: `Terlambat ${resolvedMinutes} menit`,
    status: "unpaid",
    createdAt,
  };
}

/**
 * Menentukan apakah dokumen denda boleh dibebaskan menjadi `waived`.
 * Hanya denda berstatus `unpaid` yang dapat langsung dibebaskan.
 */
export function canWaiveFine(fine: Pick<FineDoc, "status">): boolean {
  return fine.status === "unpaid";
}

/**
 * Menerapkan aturan pembebasan denda (`waived`) tanpa memodifikasi objek asli
 * dan tanpa mengubah catatan waktu kehadiran.
 * - `unpaid`  -> berubah menjadi `waived` (`allowed: true`)
 * - `paid`    -> ditolak (`allowed: false`, tetap `paid`)
 * - `pending` -> ditolak (`allowed: false`, tetap `pending`)
 * - `waived`  -> tetap `waived` (`allowed: false`)
 */
export function applyFineWaiver(fine: FineDoc): FineWaiverResult {
  if (fine.status === "unpaid") {
    return {
      allowed: true,
      fine: {
        ...fine,
        status: "waived",
      },
      reason: "Denda berhasil dibebaskan menjadi waived.",
    };
  }

  if (fine.status === "waived") {
    return {
      allowed: false,
      fine: { ...fine },
      reason: "Denda sudah berstatus waived.",
    };
  }

  if (fine.status === "pending") {
    return {
      allowed: false,
      fine: { ...fine },
      reason: "Denda berstatus pending tidak dapat dibebaskan sebelum transaksi selesai.",
    };
  }

  return {
    allowed: false,
    fine: { ...fine },
    reason: "Denda yang sudah lunas (paid) tidak dapat dibebaskan.",
  };
}
