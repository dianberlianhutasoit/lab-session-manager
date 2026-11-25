export type Role = "aslab" | "asprak" | "praktikan";

export type SessionStatus = "OPEN" | "CLOSED";

export type SprintSessionStatus = "SCHEDULED" | "OPEN" | "CLOSED";

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export type LeaveCategory =
  | "SAKIT"
  | "DISPENSASI"
  | "IZIN_AKADEMIK"
  | "LAINNYA";

export interface User {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: Role;
  nim?: string;
  createdAt?: string;
  expoPushToken?: string | null;
}

/**
 * Sprint 4 Contract — courses/{courseId} (Owned by Dev A)
 */
export interface CourseDoc {
  id: string;
  code: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LabLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface LabAttendanceConfig {
  gracePeriodMinutes: number;
  lateFineAmount: number;
}

/**
 * Sprint 4 Contract — labs/{labId} (Owned by Dev A)
 * Tetap menyertakan field kompatibilitas maps/sesi (building, latitude, longitude, radius).
 */
export interface Lab {
  id: string;
  courseId?: string;
  name: string;
  aslabId?: string;
  location?: LabLocation;
  radiusMeters?: number;
  attendanceConfig?: LabAttendanceConfig;
  code?: string;
  building: string;
  latitude: number;
  longitude: number;
  radius: number;
  capacity?: number;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LabDoc {
  id: string;
  courseId: string;
  name: string;
  aslabId: string;
  location: LabLocation;
  radiusMeters: number;
  attendanceConfig: LabAttendanceConfig;
  // Mirror flat fields for backward compatibility with existing map/session screens
  building: string;
  latitude: number;
  longitude: number;
  radius: number;
  code?: string;
  capacity?: number;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Sprint 4 Contract — labMembers/{labId_userId} (Owned by Dev A)
 */
export interface LabMemberDoc {
  id: string; // format: `${labId}_${userId}`
  labId: string;
  userId: string;
  role: "praktikan" | "asprak";
  assignedAt: string;
}

/**
 * Sprint 4 Contract — sessions/{sessionId} (Read by Dev A, Owned by Dev B)
 */
export interface SprintSessionDoc {
  id: string;
  labId: string;
  courseId: string;
  asprakId: string;
  title: string;
  sessionNumber: number;
  startAt: string;
  endAt: string;
  status: SprintSessionStatus;
  openedAt?: string;
  closedAt?: string;
  configSnapshot?: LabAttendanceConfig;
  // Legacy compatibility fields
  scheduleId?: string;
  assistantId?: string;
}

/**
 * Sprint 4 Contract — attendances/{sessionId_studentId} (Read by Dev A, Owned by Dev B)
 */
export interface SprintAttendanceDoc {
  id: string;
  sessionId: string;
  labId: string;
  studentId: string;
  status: "PRESENT" | "EXCUSED" | "ABSENT";
  checkedInAt: string;
  isLate: boolean;
  lateMinutes: number;
}

/**
 * Sprint 4 Contract — fines/{sessionId_studentId} (Read by Dev A)
 */
export type FineStatus = "unpaid" | "pending" | "paid" | "waived";

export interface FineDoc {
  id: string;
  studentId: string;
  sessionId: string;
  labId: string;
  amount: number;
  reason: string;
  status: FineStatus;
  createdAt: string;
  paidAt?: string;
}

/**
 * Payload Form untuk Tambah / Edit Laboratorium
 */
export interface LabFormInput {
  courseId?: string;
  name: string;
  code?: string;
  building: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius: number;
  gracePeriodMinutes?: number;
  lateFineAmount?: number;
  capacity?: number;
  description?: string;
}

/**
 * SRS-07: Representasi Data Kelas Praktikum (collection: classes)
 */
export interface LabClass {
  id: string;
  courseCode: string;
  title: string;
  className: string;
  room: string;
  assistantId: string;
  semester?: string;
  capacity?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Representasi Jadwal Sesi Praktikum (kompatibel dengan layar Praktikan & Rekap Presensi)
 */
export interface Schedule {
  id: string;
  classId?: string;
  className?: string;
  sessionNumber?: number;
  topic?: string;
  title: string;
  courseCode: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
}

/**
 * SRS-07 & SRS-08: Representasi Sesi Praktikum (collection: sessions)
 */
export interface Session {
  id: string;
  classId?: string;
  scheduleId: string;
  assistantId: string;
  status: SessionStatus;
  openedAt?: string;
  closedAt?: string;
  lastUpdatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * SRS-08: Catatan Riwayat Perubahan Status Sesi (OPEN / CLOSED)
 */
export interface SessionStatusLog {
  id: string;
  sessionId: string;
  previousStatus: SessionStatus;
  newStatus: SessionStatus;
  changedBy: string;
  changedByName: string;
  isSubstitute?: boolean;
  changedAt: string;
}

export type AttendanceMethod = "LOCATION" | "QR" | "MANUAL";

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export interface LabLocationConfig {
  room: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface RadiusValidationResult {
  isWithinRadius: boolean;
  distanceMeters: number;
  maxRadiusMeters: number;
  userCoordinates?: Coordinates;
  labLocation: LabLocationConfig;
}

export interface AttendanceLocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  distanceMeters?: number;
  method?: AttendanceMethod;
  qrCodeToken?: string;
}

export interface Attendance {
  id: string;
  sessionId: string;
  userId: string;
  recordedAt: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  method?: AttendanceMethod;
  qrCodeToken?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  recordedAt: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  method?: AttendanceMethod;
}

// --- Modul Pengajuan Izin & Integrasi AI Sentimen ---
export type SentimentLabel = "positif" | "netral" | "negatif" | null;

export type PermissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PermissionCategory =
  | "SAKIT"
  | "AKADEMIK"
  | "IZIN_AKADEMIK"
  | "DISPENSASI"
  | "DARURAT"
  | "LAINNYA"
  | "Unclassified";

export interface Permission {
  id: string;
  sessionId: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  reason: string;
  sentiment?: SentimentLabel;
  category?: PermissionCategory;
  aiAnalysis?: string;
  status: PermissionStatus;
  createdAt: string;
}

/**
 * SRS-10: Representasi Pengajuan Izin Praktikan (collection: leave_requests)
 */
export interface LeaveRequest {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: LeaveCategory;
  reason: string;
  attachmentName?: string;
  status: LeaveStatus;
  submittedAt: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewerNote?: string;
  sentiment?: SentimentLabel;
  aiAnalysis?: string;
}

/**
 * Payload Form untuk CRUD Kelas Praktikum (SRS-07)
 */
export interface LabClassFormInput {
  courseCode: string;
  title: string;
  className: string;
  room: string;
  assistantId: string;
  semester?: string;
  capacity?: number;
}

/**
 * Payload Form untuk CRUD Jadwal & Sesi Praktikum (SRS-07)
 */
export interface SessionScheduleFormInput {
  classId?: string;
  courseCode: string;
  title: string;
  className?: string;
  sessionNumber?: number;
  topic?: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  assistantId: string;
  status?: SessionStatus;
}
