export type Role = "praktikan" | "asisten";

export type SessionStatus = "OPEN" | "CLOSED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Schedule {
  id: string;
  title: string;
  courseCode: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
}

export interface Session {
  id: string;
  scheduleId: string;
  assistantId: string;
  status: SessionStatus;
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


