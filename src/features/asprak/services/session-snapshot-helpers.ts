import type {
  Lab,
  LabDoc,
  Schedule,
  Session,
  SessionConfigSnapshot,
} from "@/types";

export const DEFAULT_ATTENDANCE_CONFIG: SessionConfigSnapshot = {
  gracePeriodMinutes: 15,
  lateFineAmount: 15000,
};

function isValidConfigObject(
  candidate?: Partial<SessionConfigSnapshot> | null
): candidate is SessionConfigSnapshot {
  return Boolean(
    candidate &&
      typeof candidate.gracePeriodMinutes === "number" &&
      Number.isFinite(candidate.gracePeriodMinutes) &&
      candidate.gracePeriodMinutes >= 0 &&
      typeof candidate.lateFineAmount === "number" &&
      Number.isFinite(candidate.lateFineAmount) &&
      candidate.lateFineAmount >= 0
  );
}

/**
 * Mengembalikan snapshot konfigurasi dari Lab atau Session jika tersedia,
 * atau `null` jika konfigurasi belum diatur oleh Aslab (tanpa fallback diam-diam).
 */
export function resolveSessionConfigSnapshotOptional(
  lab?: (Partial<Pick<Lab, "attendanceConfig">> & Partial<Pick<LabDoc, "attendanceConfig">>) | null,
  existingSnapshot?: Partial<SessionConfigSnapshot> | null
): SessionConfigSnapshot | null {
  if (isValidConfigObject(lab?.attendanceConfig)) {
    return {
      gracePeriodMinutes: lab.attendanceConfig.gracePeriodMinutes,
      lateFineAmount: lab.attendanceConfig.lateFineAmount,
    };
  }

  if (isValidConfigObject(existingSnapshot)) {
    return {
      gracePeriodMinutes: existingSnapshot.gracePeriodMinutes,
      lateFineAmount: existingSnapshot.lateFineAmount,
    };
  }

  return null;
}

/**
 * Mewajibkan adanya konfigurasi toleransi keterlambatan & denda dari Lab atau Session.
 * Melempar error eksplisit jika konfigurasi belum diatur oleh Aslab agar tidak ada
 * penerapan denda atau toleransi secara diam-diam.
 */
export function requireSessionConfigSnapshot(
  lab?: (Partial<Pick<Lab, "attendanceConfig">> & Partial<Pick<LabDoc, "attendanceConfig">>) | null,
  existingSnapshot?: Partial<SessionConfigSnapshot> | null
): SessionConfigSnapshot {
  const resolved = resolveSessionConfigSnapshotOptional(lab, existingSnapshot);
  if (!resolved) {
    throw new Error(
      "Konfigurasi toleransi keterlambatan (gracePeriodMinutes) dan nominal denda (lateFineAmount) laboratorium belum diatur oleh Aslab."
    );
  }
  return resolved;
}

/**
 * Backward-compatible helper untuk kasus yang secara eksplisit mengizinkan fallback default.
 * Secara default (`allowDefaultFallback = false`) akan melempar error bila konfigurasi tidak tersedia.
 */
export function resolveSessionConfigSnapshot(
  lab?: (Partial<Pick<Lab, "attendanceConfig">> & Partial<Pick<LabDoc, "attendanceConfig">>) | null,
  existingSnapshot?: Partial<SessionConfigSnapshot> | null,
  options?: { allowDefaultFallback?: boolean }
): SessionConfigSnapshot {
  const optional = resolveSessionConfigSnapshotOptional(lab, existingSnapshot);
  if (optional) return optional;

  if (options?.allowDefaultFallback) {
    return { ...DEFAULT_ATTENDANCE_CONFIG };
  }

  return requireSessionConfigSnapshot(lab, existingSnapshot);
}

/**
 * Menentukan timestamp mulai sesi (`startAt` ISO UTC) dari dokumen sesi,
 * jadwal praktikum, atau waktu buka sesi.
 */
export function resolveSessionStartAt(
  session?: Partial<Pick<Session, "startAt" | "openedAt">> | null,
  schedule?: Partial<Pick<Schedule, "date" | "startTime">> | null,
  fallbackIso?: string
): string {
  if (session?.startAt && Number.isFinite(Date.parse(session.startAt))) {
    return new Date(session.startAt).toISOString();
  }

  if (schedule?.date && schedule?.startTime) {
    const candidate = `${schedule.date.trim()}T${schedule.startTime.trim()}:00+07:00`;
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  if (session?.openedAt && Number.isFinite(Date.parse(session.openedAt))) {
    return new Date(session.openedAt).toISOString();
  }

  return fallbackIso && Number.isFinite(Date.parse(fallbackIso))
    ? new Date(fallbackIso).toISOString()
    : new Date().toISOString();
}
