import type { Attendance, Schedule, Session, User } from "../types";

export const users: User[] = [
  {
    id: "user-praktikan-001",
    name: "Nadia Putri",
    email: "nadia.putri@example.test",
    role: "praktikan",
  },
  {
    id: "user-praktikan-002",
    name: "Rafi Pratama",
    email: "rafi.pratama@example.test",
    role: "praktikan",
  },
  {
    id: "user-praktikan-003",
    name: "Sinta Maharani",
    email: "sinta.maharani@example.test",
    role: "praktikan",
  },
  {
    id: "user-asisten-001",
    name: "Dimas Saputra",
    email: "dimas.saputra@example.test",
    role: "asisten",
  },
  {
    id: "user-asisten-002",
    name: "Ayu Lestari",
    email: "ayu.lestari@example.test",
    role: "asisten",
  },
];

export const schedules: Schedule[] = [
  {
    id: "schedule-001",
    title: "Dasar Pemrograman",
    courseCode: "LAB101",
    date: "2026-10-26",
    startTime: "09:00",
    endTime: "11:00",
    room: "Lab Komputer 1",
  },
  {
    id: "schedule-002",
    title: "Basis Data",
    courseCode: "LAB204",
    date: "2026-10-27",
    startTime: "13:00",
    endTime: "15:00",
    room: "Lab Komputer 2",
  },
  {
    id: "schedule-003",
    title: "Jaringan Komputer",
    courseCode: "LAB305",
    date: "2026-10-28",
    startTime: "10:00",
    endTime: "12:00",
    room: "Lab Jaringan",
  },
];

export const sessions: Session[] = [
  {
    id: "session-001",
    scheduleId: "schedule-001",
    assistantId: "user-asisten-001",
    status: "OPEN",
  },
  {
    id: "session-002",
    scheduleId: "schedule-002",
    assistantId: "user-asisten-002",
    status: "CLOSED",
  },
  {
    id: "session-003",
    scheduleId: "schedule-003",
    assistantId: "user-asisten-001",
    status: "CLOSED",
  },
];

export const attendance: Attendance[] = [
  {
    id: "attendance-001",
    sessionId: "session-002",
    userId: "user-praktikan-001",
    recordedAt: "2026-10-27T13:02:00+07:00",
  },
  {
    id: "attendance-002",
    sessionId: "session-002",
    userId: "user-praktikan-002",
    recordedAt: "2026-10-27T13:04:00+07:00",
  },
  {
    id: "attendance-003",
    sessionId: "session-003",
    userId: "user-praktikan-003",
    recordedAt: "2026-10-28T10:01:00+07:00",
  },
];
