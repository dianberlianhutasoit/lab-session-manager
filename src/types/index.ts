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
