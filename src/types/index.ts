export type Role = "praktikan" | "asisten";

export type SessionStatus = "OPEN" | "CLOSED";

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export type LeaveCategory =
  | "SAKIT"
  | "DISPENSASI"
  | "IZIN_AKADEMIK"
  | "LAINNYA";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  expoPushToken?: string | null;
}

/**
 * SRS-07 Sprint 3: Representasi Data Lokasi Laboratorium (collection: labs)
 */
export interface Lab {
  id: string;
  name: string;
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

/**
 * Payload Form untuk Tambah / Edit Laboratorium
 */
export interface LabFormInput {
  name: string;
  code?: string;
  building: string;
  latitude: number;
  longitude: number;
  radius: number;
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
