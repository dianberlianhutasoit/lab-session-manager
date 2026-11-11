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
