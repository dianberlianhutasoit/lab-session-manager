export type TimestampInput = string | number | Date;

export interface LatenessEvaluation {
  isLate: boolean;
  lateMinutes: number;
  deadlineAt: string;
  checkedInAt: string;
}

const MS_PER_MINUTE = 60_000;

/**
 * Mengonversi input timestamp (ISO string, epoch ms, atau Date) menjadi milidetik UTC.
 * Melempar error apabila input tidak valid atau kosong.
 */
export function parseTimestampMs(input: TimestampInput, fieldLabel: string): number {
  if (input instanceof Date) {
    const ms = input.getTime();
    if (!Number.isFinite(ms)) {
      throw new Error(`${fieldLabel} tidak valid.`);
    }
    return ms;
  }

  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      throw new Error(`${fieldLabel} tidak valid.`);
    }
    return input;
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error(`${fieldLabel} tidak boleh kosong.`);
    }
    const ms = Date.parse(trimmed);
    if (!Number.isFinite(ms)) {
      throw new Error(`${fieldLabel} tidak memiliki format tanggal yang valid.`);
    }
    return ms;
  }

  throw new Error(`${fieldLabel} tidak valid.`);
}

/**
 * Menghitung batas waktu toleransi check-in (dalam milidetik UTC):
 * startAt + gracePeriodMinutes.
 */
export function computeToleranceDeadlineMs(
  sessionStartAt: TimestampInput,
  gracePeriodMinutes: number
): number {
  if (!Number.isFinite(gracePeriodMinutes) || gracePeriodMinutes < 0) {
    throw new Error(
      "Batas toleransi keterlambatan (gracePeriodMinutes) tidak boleh bernilai negatif."
    );
  }

  const startMs = parseTimestampMs(sessionStartAt, "Waktu mulai sesi");
  return startMs + gracePeriodMinutes * MS_PER_MINUTE;
}

/**
 * Mengevaluasi keterlambatan presensi praktikan berdasarkan timestamp UTC:
 * - Tepat Waktu: checkedInAt <= sessionStartAt + gracePeriodMinutes
 * - Terlambat:   checkedInAt >  sessionStartAt + gracePeriodMinutes
 * - Pembulatan ke atas (Math.ceil) diterapkan untuk selisih positif < 1 menit penuh.
 */
export function evaluateCheckInLateness(
  sessionStartAt: TimestampInput,
  checkedInAt: TimestampInput,
  gracePeriodMinutes: number
): LatenessEvaluation {
  const deadlineMs = computeToleranceDeadlineMs(sessionStartAt, gracePeriodMinutes);
  const checkedInMs = parseTimestampMs(checkedInAt, "Waktu check-in");

  const diffMs = checkedInMs - deadlineMs;
  const isLate = diffMs > 0;
  const lateMinutes = isLate ? Math.ceil(diffMs / MS_PER_MINUTE) : 0;

  return {
    isLate,
    lateMinutes,
    deadlineAt: new Date(deadlineMs).toISOString(),
    checkedInAt: new Date(checkedInMs).toISOString(),
  };
}
