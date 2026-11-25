import type {
  CourseDoc,
  FineDoc,
  LabDoc,
  LabMemberDoc,
  SessionDoc,
  UserDoc,
} from "@/types";

/**
 * Seed Data Hari Pertama Sprint 4 (Sesuai Kontrak Bagian 5)
 * Memungkinkan Dev B dan anggota tim menguji skema Sprint 4 secara mandiri
 * tanpa harus menunggu fitur Dev A atau Dev C selesai terlebih dahulu.
 */
export const sprint4SeedUsers: UserDoc[] = [
  {
    uid: "user-aslab-1",
    name: "Aslab Lab Terpadu",
    email: "aslab@test.com",
    role: "aslab",
    createdAt: "2026-11-25T07:00:00.000Z",
  },
  {
    uid: "user-asprak-1",
    name: "Asprak Dasar Pemrograman",
    email: "asprak@test.com",
    role: "asprak",
    createdAt: "2026-11-25T07:00:00.000Z",
  },
  {
    uid: "user-mhs-1",
    name: "Mahasiswa Uji Satu",
    email: "mhs1@test.com",
    role: "praktikan",
    nim: "2110511001",
    createdAt: "2026-11-25T07:00:00.000Z",
  },
  {
    uid: "user-mhs-2",
    name: "Mahasiswa Uji Dua",
    email: "mhs2@test.com",
    role: "praktikan",
    nim: "2110511002",
    createdAt: "2026-11-25T07:00:00.000Z",
  },
];

export const sprint4SeedCourses: CourseDoc[] = [
  {
    id: "course-if101",
    code: "IF101",
    name: "Dasar Pemrograman",
  },
];

export const sprint4SeedLabs: LabDoc[] = [
  {
    id: "lab-01",
    courseId: "course-if101",
    name: "Lab Komputer 01",
    aslabId: "user-aslab-1",
    location: {
      name: "Gedung 5 Lantai 2",
      address: "Kampus Utama Lab Informatika",
      latitude: 2.38324,
      longitude: 99.14845,
    },
    radiusMeters: 30,
    attendanceConfig: {
      gracePeriodMinutes: 15,
      lateFineAmount: 15000,
    },
  },
];

export const sprint4SeedLabMembers: LabMemberDoc[] = [
  {
    id: "lab-01_user-asprak-1",
    labId: "lab-01",
    userId: "user-asprak-1",
    role: "asprak",
    assignedAt: "2026-11-25T07:05:00.000Z",
  },
  {
    id: "lab-01_user-mhs-1",
    labId: "lab-01",
    userId: "user-mhs-1",
    role: "praktikan",
    assignedAt: "2026-11-25T07:05:00.000Z",
  },
  {
    id: "lab-01_user-mhs-2",
    labId: "lab-01",
    userId: "user-mhs-2",
    role: "praktikan",
    assignedAt: "2026-11-25T07:05:00.000Z",
  },
];

export const sprint4SeedSessions: SessionDoc[] = [
  {
    id: "session-01",
    labId: "lab-01",
    courseId: "course-if101",
    asprakId: "user-asprak-1",
    title: "Modul 1: Pengenalan Algoritma & Pemrograman",
    sessionNumber: 1,
    startAt: "2026-11-25T08:00:00.000Z",
    endAt: "2026-11-25T10:00:00.000Z",
    status: "OPEN",
    openedAt: "2026-11-25T07:55:00.000Z",
    configSnapshot: {
      gracePeriodMinutes: 15,
      lateFineAmount: 15000,
    },
  },
];

export const sprint4SeedFines: FineDoc[] = [
  {
    id: "session-01_user-mhs-1",
    studentId: "user-mhs-1",
    sessionId: "session-01",
    labId: "lab-01",
    amount: 15000,
    reason: "Terlambat 10 menit melewati batas toleransi",
    status: "unpaid",
    createdAt: "2026-11-25T08:25:00.000Z",
  },
  {
    id: "session-01_user-mhs-2",
    studentId: "user-mhs-2",
    sessionId: "session-01",
    labId: "lab-01",
    amount: 15000,
    reason: "Terlambat 5 menit melewati batas toleransi",
    status: "paid",
    createdAt: "2026-11-25T08:20:00.000Z",
    paidAt: "2026-11-25T10:00:00.000Z",
  },
];
