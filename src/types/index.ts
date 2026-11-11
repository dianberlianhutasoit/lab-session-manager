export type Role = "praktikan" | "asisten";

export type SessionStatus = "OPEN" | "CLOSED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
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
 * SRS-07: Representasi Sesi Praktikum (collection: sessions)
 */
export interface Session {
  id: string;
  classId?: string;
  scheduleId: string;
  assistantId: string;
  status: SessionStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Attendance {
  id: string;
  sessionId: string;
  userId: string;
  recordedAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  recordedAt: string;
}

// --- SRS-11 s/d SRS-13: Modul Pengajuan Izin & Integrasi AI ---
export type PermissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PermissionCategory =
  | "SAKIT"
  | "AKADEMIK"
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
  category: PermissionCategory;
  aiAnalysis?: string;
  status: PermissionStatus;
  createdAt: string;
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
