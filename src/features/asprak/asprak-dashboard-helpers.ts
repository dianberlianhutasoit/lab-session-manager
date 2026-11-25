import type {
  AttendanceCheckInStatus,
  AttendanceDoc,
  AttendanceRecord,
  FineDoc,
  LabMemberDoc,
  LeaveRequest,
  Session,
  Sprint4SessionStatus,
  User,
} from "@/types";
import { buildAttendanceId, buildFineId } from "@/features/presensi/fine-rules";

export type RosterDisplayStatus = AttendanceCheckInStatus | "PENDING_CHECKIN";

export interface SessionRosterItem {
  studentId: string;
  name: string;
  nim: string;
  email: string;
  attendanceStatus: RosterDisplayStatus;
  checkedInAt?: string;
  isLate: boolean;
  lateMinutes: number;
  fine: FineDoc | null;
  leaveRequest: LeaveRequest | null;
}

export interface LeaveActionEvaluation {
  canAct: boolean;
  blockReason: string | null;
  fineNoticeType: "none" | "info" | "warning";
  fineNoticeMessage: string | null;
}

/**
 * Mengembalikan hanya sesi yang ditugaskan kepada Asprak tertentu (`asprakId` / `assistantId`).
 */
export function filterSessionsForAsprak<
  T extends Pick<Session, "assistantId" | "asprakId">
>(sessions: T[], asprakId?: string | null): T[] {
  const normalizedId = asprakId?.trim();
  if (!normalizedId) return [];
  return sessions.filter(
    (session) => (session.asprakId || session.assistantId) === normalizedId
  );
}

/**
 * Memastikan hanya Asprak yang ditugaskan pada sesi tersebut yang berhak mengelolanya.
 */
export function isAsprakAssignedToSession(
  session?: Pick<Session, "assistantId" | "asprakId"> | null,
  asprakId?: string | null
): boolean {
  const normalizedId = asprakId?.trim();
  if (!session || !normalizedId) return false;
  return (session.asprakId || session.assistantId) === normalizedId;
}

/**
 * Menormalkan status sesi menjadi kontrak Sprint 4:
 * `SCHEDULED` | `OPEN` | `CLOSED`.
 * Sesi legacy dengan `status === 'CLOSED'` yang belum pernah dibuka (`!openedAt`)
 * diperlakukan sebagai `SCHEDULED`.
 */
export function getEffectiveSessionStatus(
  session: Pick<Session, "openedAt" | "closedAt"> & { status: string }
): Sprint4SessionStatus {
  if (session.status === "OPEN") return "OPEN";
  if (session.status === "SCHEDULED") return "SCHEDULED";
  if (session.status === "CLOSED" && !session.openedAt && !session.closedAt) {
    return "SCHEDULED";
  }
  return "CLOSED";
}

/**
 * Menyusun daftar monitoring kehadiran praktikan pada suatu sesi secara real-time
 * dari koleksi `attendances`, `fines`, `leave_requests`, `labMembers`, dan `users`.
 */
export function buildSessionAttendanceRoster(params: {
  session: Pick<Session, "id" | "labId" | "openedAt" | "closedAt"> & { status: string };
  attendanceDocs: AttendanceDoc[];
  legacyRecords?: AttendanceRecord[];
  fines: FineDoc[];
  users: User[];
  leaveRequests: LeaveRequest[];
  labMembers?: LabMemberDoc[];
}): SessionRosterItem[] {
  const {
    session,
    attendanceDocs,
    legacyRecords = [],
    fines,
    users,
    leaveRequests,
    labMembers = [],
  } = params;

  const effectiveStatus = getEffectiveSessionStatus(session);
  const sessionAttDocs = attendanceDocs.filter((a) => a.sessionId === session.id);
  const sessionFines = fines.filter((f) => f.sessionId === session.id);
  const sessionLeaves = leaveRequests.filter((l) => l.sessionId === session.id);

  // Prioritaskan anggota lab dari `labMembers` jika tersedia untuk lab sesi ini
  const enrolledLabMemberIds = session.labId
    ? new Set(
        labMembers
          .filter((m) => m.labId === session.labId && m.role === "praktikan")
          .map((m) => m.userId)
      )
    : new Set<string>();

  const practitionerMap = new Map<string, User>();
  for (const user of users) {
    if (user.role !== "praktikan") continue;
    if (enrolledLabMemberIds.size > 0 && !enrolledLabMemberIds.has(user.id)) {
      continue;
    }
    practitionerMap.set(user.id, user);
  }

  // Pastikan mahasiswa yang sudah memiliki check-in, izin, atau denda tetap muncul
  const relevantIds = new Set<string>(practitionerMap.keys());
  sessionAttDocs.forEach((a) => relevantIds.add(a.studentId));
  legacyRecords.forEach((r) => relevantIds.add(r.userId));
  sessionLeaves.forEach((l) => relevantIds.add(l.userId));
  sessionFines.forEach((f) => relevantIds.add(f.studentId));

  const roster: SessionRosterItem[] = [];

  for (const studentId of relevantIds) {
    const user = users.find((u) => u.id === studentId);
    const attDoc = sessionAttDocs.find(
      (a) => a.id === buildAttendanceId(session.id, studentId) || a.studentId === studentId
    );
    const legacy = legacyRecords.find((r) => r.userId === studentId);
    const leave = sessionLeaves.find((l) => l.userId === studentId) ?? null;
    const fine =
      sessionFines.find(
        (f) => f.id === buildFineId(session.id, studentId) || f.studentId === studentId
      ) ?? null;

    let attendanceStatus: RosterDisplayStatus;
    let checkedInAt: string | undefined;
    let isLate = false;
    let lateMinutes = 0;

    if (attDoc) {
      attendanceStatus = attDoc.status;
      checkedInAt = attDoc.checkedInAt;
      isLate = attDoc.isLate;
      lateMinutes = attDoc.lateMinutes;
    } else if (legacy) {
      attendanceStatus = "PRESENT";
      checkedInAt = legacy.recordedAt;
    } else if (leave?.status === "APPROVED") {
      attendanceStatus = "EXCUSED";
    } else if (effectiveStatus === "CLOSED") {
      attendanceStatus = "ABSENT";
    } else {
      attendanceStatus = "PENDING_CHECKIN";
    }

    roster.push({
      studentId,
      name: user?.name ?? legacy?.userName ?? leave?.userName ?? "Mahasiswa",
      nim: user?.nim ?? "-",
      email: user?.email ?? legacy?.userEmail ?? leave?.userEmail ?? "-",
      attendanceStatus,
      checkedInAt,
      isLate,
      lateMinutes,
      fine,
      leaveRequest: leave,
    });
  }

  const orderWeight: Record<RosterDisplayStatus, number> = {
    PRESENT: 0,
    EXCUSED: 1,
    PENDING_CHECKIN: 2,
    ABSENT: 3,
  };

  return roster.sort((a, b) => {
    const weightDiff = orderWeight[a.attendanceStatus] - orderWeight[b.attendanceStatus];
    if (weightDiff !== 0) return weightDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Mengevaluasi apakah Asprak berhak melakukan Approve/Reject pada pengajuan izin,
 * serta menyiapkan informasi status denda (`unpaid`, `pending`, `paid`, `waived`).
 */
export function evaluateLeaveActionState(params: {
  request: Pick<LeaveRequest, "status">;
  relatedFine?: FineDoc | null;
  isAuthorized: boolean;
  isOnline: boolean;
  isSubmitting?: boolean;
}): LeaveActionEvaluation {
  const { request, relatedFine, isAuthorized, isOnline, isSubmitting = false } = params;

  let fineNoticeType: LeaveActionEvaluation["fineNoticeType"] = "none";
  let fineNoticeMessage: string | null = null;

  if (relatedFine) {
    if (relatedFine.status === "unpaid") {
      fineNoticeType = "info";
      fineNoticeMessage = `Terdapat denda belum dibayar (Rp${relatedFine.amount.toLocaleString("id-ID")}). Menyetujui izin akan mengubah status denda menjadi waived.`;
    } else if (relatedFine.status === "pending") {
      fineNoticeType = "warning";
      fineNoticeMessage =
        "Terdapat tagihan denda berstatus PENDING (transaksi pembayaran sedang berjalan). Status denda tidak akan diubah menjadi waived secara otomatis.";
    } else if (relatedFine.status === "paid") {
      fineNoticeType = "warning";
      fineNoticeMessage =
        "Denda keterlambatan pada sesi ini sudah LUNAS (paid) dan tidak akan diubah menjadi waived.";
    } else if (relatedFine.status === "waived") {
      fineNoticeType = "info";
      fineNoticeMessage = "Denda keterlambatan pada sesi ini sudah berstatus waived.";
    }
  }

  if (!isAuthorized) {
    return {
      canAct: false,
      blockReason: "Anda tidak memiliki kewenangan untuk meninjau izin pada sesi milik Asprak lain.",
      fineNoticeType,
      fineNoticeMessage,
    };
  }

  if (!isOnline) {
    return {
      canAct: false,
      blockReason: "Koneksi ke server terputus. Keputusan izin tidak dapat diproses saat offline.",
      fineNoticeType,
      fineNoticeMessage,
    };
  }

  if (request.status !== "PENDING") {
    return {
      canAct: false,
      blockReason: `Permintaan izin ini sudah diproses (${request.status}).`,
      fineNoticeType,
      fineNoticeMessage,
    };
  }

  if (isSubmitting) {
    return {
      canAct: false,
      blockReason: "Sedang menyimpan keputusan ke Firestore...",
      fineNoticeType,
      fineNoticeMessage,
    };
  }

  return {
    canAct: true,
    blockReason: null,
    fineNoticeType,
    fineNoticeMessage,
  };
}
