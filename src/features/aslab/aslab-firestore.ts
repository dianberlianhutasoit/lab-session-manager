import { Platform } from 'react-native';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from '@react-native-firebase/firestore';

import { firestore } from '@/services/firebase';
import type {
  CourseDoc,
  FineDoc,
  LabDoc,
  LabMemberDoc,
  SprintAttendanceDoc,
  SprintSessionDoc,
  User,
} from '@/types';
import type { AslabLabFormInput, CourseFormInput, TransferMemberPayload } from './types';

export const ASLAB_COLLECTIONS = {
  USERS: 'users',
  COURSES: 'courses',
  LABS: 'labs',
  LAB_MEMBERS: 'labMembers',
  SESSIONS: 'sessions',
  ATTENDANCES: 'attendances',
  FINES: 'fines',
} as const;

function stripUndefined<T extends object>(obj: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function getFirestoreInstance(): typeof firestore | null {
  if (Platform.OS === 'web') {
    return null;
  }
  return firestore;
}

/**
 * Normalizes both Sprint 4 LabDoc and legacy Sprint 3 flat Lab documents
 * so existing maps/sessions and new Aslab screens stay 100% interoperable.
 */
export function normalizeLabDoc(id: string, raw: Record<string, unknown>): LabDoc {
  const loc = (raw.location as Record<string, unknown> | undefined) ?? {};
  const cfg = (raw.attendanceConfig as Record<string, unknown> | undefined) ?? {};

  const latitude =
    typeof loc.latitude === 'number'
      ? loc.latitude
      : typeof raw.latitude === 'number'
      ? raw.latitude
      : -6.9175;
  const longitude =
    typeof loc.longitude === 'number'
      ? loc.longitude
      : typeof raw.longitude === 'number'
      ? raw.longitude
      : 107.6191;
  const building =
    typeof loc.name === 'string' && loc.name.trim()
      ? loc.name
      : typeof raw.building === 'string' && raw.building.trim()
      ? raw.building
      : 'Gedung Laboratorium';
  const address =
    typeof loc.address === 'string' && loc.address.trim()
      ? loc.address
      : building;
  const radiusMeters =
    typeof raw.radiusMeters === 'number'
      ? raw.radiusMeters
      : typeof raw.radius === 'number'
      ? raw.radius
      : 30;
  const gracePeriodMinutes =
    typeof cfg.gracePeriodMinutes === 'number' ? cfg.gracePeriodMinutes : 15;
  const lateFineAmount =
    typeof cfg.lateFineAmount === 'number' ? cfg.lateFineAmount : 10000;

  return {
    id,
    courseId: typeof raw.courseId === 'string' ? raw.courseId : '',
    name: typeof raw.name === 'string' ? raw.name : 'Laboratorium',
    aslabId: typeof raw.aslabId === 'string' ? raw.aslabId : '',
    location: {
      name: building,
      address,
      latitude,
      longitude,
    },
    radiusMeters,
    attendanceConfig: {
      gracePeriodMinutes,
      lateFineAmount,
    },
    building,
    latitude,
    longitude,
    radius: radiusMeters,
    code: typeof raw.code === 'string' ? raw.code : undefined,
    capacity: typeof raw.capacity === 'number' ? raw.capacity : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    isActive: typeof raw.isActive === 'boolean' ? raw.isActive : true,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

export function normalizeUserDoc(id: string, raw: Record<string, unknown>): User {
  const rawRole = raw.role;
  const role: User['role'] =
    rawRole === 'aslab' || rawRole === 'asprak' || rawRole === 'praktikan'
      ? rawRole
      : 'praktikan';

  return {
    id,
    uid: typeof raw.uid === 'string' ? raw.uid : id,
    name: typeof raw.name === 'string' ? raw.name : 'Pengguna',
    email: typeof raw.email === 'string' ? raw.email : '',
    role,
    nim: typeof raw.nim === 'string' ? raw.nim : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    expoPushToken: typeof raw.expoPushToken === 'string' ? raw.expoPushToken : null,
  };
}

export function subscribeAslabCollection<T>(
  collectionName: string,
  mapper: (id: string, data: Record<string, unknown>) => T,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  const db = getFirestoreInstance();
  if (!db) {
    return () => {};
  }

  return onSnapshot(
    collection(db, collectionName),
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push(mapper(docSnap.id, docSnap.data() as Record<string, unknown>));
      });
      onData(items);
    },
    (error) => {
      console.warn(`[AslabFirestore] Error listening to ${collectionName}:`, error);
      onError?.(error);
    }
  );
}

// ============================================================
// WRITE OPERATIONS — Strictly Dev A Owned Collections Only:
// `courses`, `labs`, `labMembers`
// ============================================================

export async function createCourseInFirestore(input: CourseFormInput): Promise<CourseDoc> {
  const db = getFirestoreInstance();
  const normalizedCode = input.code.trim().toUpperCase();
  const id = `course-${normalizedCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const payload: CourseDoc = {
    id,
    code: normalizedCode,
    name: input.name.trim(),
    createdAt: now,
    updatedAt: now,
  };

  if (db) {
    await setDoc(doc(db, ASLAB_COLLECTIONS.COURSES, id), stripUndefined(payload));
  }
  return payload;
}

export async function updateCourseInFirestore(
  courseId: string,
  input: CourseFormInput
): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) return;

  await updateDoc(doc(db, ASLAB_COLLECTIONS.COURSES, courseId), {
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCourseInFirestore(courseId: string): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) return;

  await deleteDoc(doc(db, ASLAB_COLLECTIONS.COURSES, courseId));
}

function buildLabDocument(id: string, aslabId: string, input: AslabLabFormInput, createdAt?: string): LabDoc {
  const now = new Date().toISOString();
  const building = input.building.trim() || 'Gedung Laboratorium';
  const address = input.address.trim() || building;

  return {
    id,
    courseId: input.courseId,
    name: input.name.trim(),
    aslabId,
    location: {
      name: building,
      address,
      latitude: input.latitude,
      longitude: input.longitude,
    },
    radiusMeters: input.radiusMeters,
    attendanceConfig: {
      gracePeriodMinutes: input.gracePeriodMinutes,
      lateFineAmount: input.lateFineAmount,
    },
    // Flat mirror fields for existing maps.tsx & session screens
    building,
    latitude: input.latitude,
    longitude: input.longitude,
    radius: input.radiusMeters,
    capacity: input.capacity,
    description: input.description?.trim() || undefined,
    isActive: true,
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
}

export async function createLabInFirestore(
  aslabId: string,
  input: AslabLabFormInput
): Promise<LabDoc> {
  const db = getFirestoreInstance();
  const slug = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  const id = `lab-${slug || 'baru'}-${Date.now().toString(36)}`;
  const labDoc = buildLabDocument(id, aslabId, input);

  if (db) {
    await setDoc(doc(db, ASLAB_COLLECTIONS.LABS, id), stripUndefined(labDoc));
  }
  return labDoc;
}

export async function updateLabInFirestore(
  labId: string,
  aslabId: string,
  input: AslabLabFormInput,
  existingCreatedAt?: string
): Promise<LabDoc> {
  const db = getFirestoreInstance();
  const labDoc = buildLabDocument(labId, aslabId, input, existingCreatedAt);

  if (db) {
    await setDoc(doc(db, ASLAB_COLLECTIONS.LABS, labId), stripUndefined(labDoc), { merge: true });
  }
  return labDoc;
}

export async function deleteLabInFirestore(labId: string): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) return;

  await deleteDoc(doc(db, ASLAB_COLLECTIONS.LABS, labId));
}

/**
 * Bulk 1: Pembuatan banyak Lab sekaligus berdasarkan 1 Mata Kuliah
 */
export async function bulkCreateLabsInFirestore(
  aslabId: string,
  courseId: string,
  inputs: Omit<AslabLabFormInput, 'courseId'>[]
): Promise<LabDoc[]> {
  const db = getFirestoreInstance();
  const created: LabDoc[] = [];
  const baseTs = Date.now();

  if (db) {
    const batch = writeBatch(db);
    inputs.forEach((item, index) => {
      const slug = item.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 20);
      const id = `lab-${slug || 'bulk'}-${(baseTs + index).toString(36)}`;
      const labDoc = buildLabDocument(id, aslabId, { ...item, courseId });
      created.push(labDoc);
      batch.set(doc(db, ASLAB_COLLECTIONS.LABS, id), stripUndefined(labDoc));
    });
    await batch.commit();
  } else {
    inputs.forEach((item, index) => {
      const id = `lab-bulk-${(baseTs + index).toString(36)}`;
      created.push(buildLabDocument(id, aslabId, { ...item, courseId }));
    });
  }

  return created;
}

/**
 * Bulk 2 & Bulk 3: Alokasi banyak Praktikan atau Asprak ke Lab tertentu
 * ID deterministik: `${labId}_${userId}`
 */
export async function bulkAssignLabMembersInFirestore(
  labId: string,
  role: LabMemberDoc['role'],
  userIds: string[]
): Promise<LabMemberDoc[]> {
  const db = getFirestoreInstance();
  const now = new Date().toISOString();
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const assigned: LabMemberDoc[] = uniqueUserIds.map((userId) => ({
    id: `${labId}_${userId}`,
    labId,
    userId,
    role,
    assignedAt: now,
  }));

  if (db && assigned.length > 0) {
    const batch = writeBatch(db);
    for (const member of assigned) {
      batch.set(doc(db, ASLAB_COLLECTIONS.LAB_MEMBERS, member.id), stripUndefined(member), {
        merge: true,
      });
    }
    await batch.commit();
  }

  return assigned;
}

export async function assignSingleLabMemberInFirestore(
  labId: string,
  userId: string,
  role: LabMemberDoc['role']
): Promise<LabMemberDoc> {
  const [created] = await bulkAssignLabMembersInFirestore(labId, role, [userId]);
  return created;
}

export async function removeLabMemberInFirestore(labId: string, userId: string): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) return;

  await deleteDoc(doc(db, ASLAB_COLLECTIONS.LAB_MEMBERS, `${labId}_${userId}`));
}

/**
 * Pemindahan Anggota Lab secara atomik tanpa memindahkan jadwal/sesi praktikum.
 */
export async function transferLabMemberInFirestore(
  payload: TransferMemberPayload
): Promise<LabMemberDoc> {
  const { fromLabId, toLabId, userId, role } = payload;
  if (fromLabId === toLabId) {
    throw new Error('Lab tujuan tidak boleh sama dengan lab asal.');
  }

  const now = new Date().toISOString();
  const oldId = `${fromLabId}_${userId}`;
  const newId = `${toLabId}_${userId}`;
  const nextMember: LabMemberDoc = {
    id: newId,
    labId: toLabId,
    userId,
    role,
    assignedAt: now,
  };

  const db = getFirestoreInstance();
  if (db) {
    await runTransaction(db, async (tx) => {
      const oldRef = doc(db, ASLAB_COLLECTIONS.LAB_MEMBERS, oldId);
      const newRef = doc(db, ASLAB_COLLECTIONS.LAB_MEMBERS, newId);
      const oldSnap = await tx.get(oldRef);
      if (oldSnap.exists()) {
        tx.delete(oldRef);
      }
      tx.set(newRef, stripUndefined(nextMember), { merge: true });
    });
  }

  return nextMember;
}

// ============================================================
// SPRINT 4 DAY-1 SEED DATA (Kickoff Dataset — Section 5)
// ============================================================

export function getSprint4SeedSnapshot(aslabUid?: string): {
  users: User[];
  courses: CourseDoc[];
  labs: LabDoc[];
  labMembers: LabMemberDoc[];
  sessions: SprintSessionDoc[];
  attendances: SprintAttendanceDoc[];
  fines: FineDoc[];
} {
  const now = new Date();
  const nowIso = now.toISOString();
  const startActive = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
  const endActive = new Date(now.getTime() + 100 * 60 * 1000).toISOString();
  const startUpcoming = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
  const endUpcoming = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString();
  const startClosed = new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString();
  const endClosed = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const ownerAslabId = aslabUid || 'user-aslab-1';

  const users: User[] = [
    {
      id: 'user-aslab-1',
      uid: 'user-aslab-1',
      name: 'Dr. Hendra Wijaya',
      email: 'aslab@test.com',
      role: 'aslab',
      createdAt: nowIso,
    },
    {
      id: 'user-asprak-1',
      uid: 'user-asprak-1',
      name: 'Dimas Saputra',
      email: 'asprak@test.com',
      role: 'asprak',
      createdAt: nowIso,
    },
    {
      id: 'user-asprak-2',
      uid: 'user-asprak-2',
      name: 'Ayu Lestari',
      email: 'ayu.asprak@test.com',
      role: 'asprak',
      createdAt: nowIso,
    },
    {
      id: 'user-mhs-1',
      uid: 'user-mhs-1',
      name: 'Nadia Putri',
      email: 'mhs1@test.com',
      role: 'praktikan',
      nim: '2110511001',
      createdAt: nowIso,
    },
    {
      id: 'user-mhs-2',
      uid: 'user-mhs-2',
      name: 'Rafi Pratama',
      email: 'mhs2@test.com',
      role: 'praktikan',
      nim: '2110511002',
      createdAt: nowIso,
    },
    {
      id: 'user-mhs-3',
      uid: 'user-mhs-3',
      name: 'Sinta Maharani',
      email: 'mhs3@test.com',
      role: 'praktikan',
      nim: '2110511003',
      createdAt: nowIso,
    },
  ];

  const courses: CourseDoc[] = [
    {
      id: 'course-if101',
      code: 'IF101',
      name: 'Dasar Pemrograman',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'course-if204',
      code: 'IF204',
      name: 'Basis Data',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const labs: LabDoc[] = [
    buildLabDocument('lab-01', ownerAslabId, {
      courseId: 'course-if101',
      name: 'Lab Komputer 1',
      building: 'Gedung Fasilkom Lt. 2',
      address: 'Jl. Kampus Fasilkom No. 1, Ruang 201',
      latitude: -6.9175,
      longitude: 107.6191,
      radiusMeters: 30,
      gracePeriodMinutes: 15,
      lateFineAmount: 15000,
      capacity: 35,
      description: 'PC Core i7, 16GB RAM, Proyektor HD',
    }),
    buildLabDocument('lab-02', ownerAslabId, {
      courseId: 'course-if204',
      name: 'Lab Basis Data',
      building: 'Gedung Fasilkom Lt. 3',
      address: 'Jl. Kampus Fasilkom No. 1, Ruang 302',
      latitude: -6.9178,
      longitude: 107.6194,
      radiusMeters: 35,
      gracePeriodMinutes: 10,
      lateFineAmount: 10000,
      capacity: 30,
      description: 'Server PostgreSQL lokal & 30 workstation',
    }),
  ];

  const labMembers: LabMemberDoc[] = [
    {
      id: 'lab-01_user-asprak-1',
      labId: 'lab-01',
      userId: 'user-asprak-1',
      role: 'asprak',
      assignedAt: nowIso,
    },
    {
      id: 'lab-01_user-mhs-1',
      labId: 'lab-01',
      userId: 'user-mhs-1',
      role: 'praktikan',
      assignedAt: nowIso,
    },
    {
      id: 'lab-01_user-mhs-2',
      labId: 'lab-01',
      userId: 'user-mhs-2',
      role: 'praktikan',
      assignedAt: nowIso,
    },
    {
      id: 'lab-02_user-asprak-2',
      labId: 'lab-02',
      userId: 'user-asprak-2',
      role: 'asprak',
      assignedAt: nowIso,
    },
    {
      id: 'lab-02_user-mhs-3',
      labId: 'lab-02',
      userId: 'user-mhs-3',
      role: 'praktikan',
      assignedAt: nowIso,
    },
  ];

  const sessions: SprintSessionDoc[] = [
    {
      id: 'session-01',
      labId: 'lab-01',
      courseId: 'course-if101',
      asprakId: 'user-asprak-1',
      title: 'Modul 1: Algoritma & Struktur Kontrol',
      sessionNumber: 1,
      startAt: startActive,
      endAt: endActive,
      status: 'OPEN',
      openedAt: startActive,
      configSnapshot: { gracePeriodMinutes: 15, lateFineAmount: 15000 },
    },
    {
      id: 'session-02',
      labId: 'lab-02',
      courseId: 'course-if204',
      asprakId: 'user-asprak-2',
      title: 'Modul 2: Normalisasi & ERD Relasional',
      sessionNumber: 2,
      startAt: startUpcoming,
      endAt: endUpcoming,
      status: 'SCHEDULED',
      configSnapshot: { gracePeriodMinutes: 10, lateFineAmount: 10000 },
    },
    {
      id: 'session-03',
      labId: 'lab-01',
      courseId: 'course-if101',
      asprakId: 'user-asprak-1',
      title: 'Pertemuan Pengenalan Lingkungan Lab',
      sessionNumber: 0,
      startAt: startClosed,
      endAt: endClosed,
      status: 'CLOSED',
      openedAt: startClosed,
      closedAt: endClosed,
      configSnapshot: { gracePeriodMinutes: 15, lateFineAmount: 15000 },
    },
  ];

  const attendances: SprintAttendanceDoc[] = [
    {
      id: 'session-01_user-mhs-1',
      sessionId: 'session-01',
      labId: 'lab-01',
      studentId: 'user-mhs-1',
      status: 'PRESENT',
      checkedInAt: nowIso,
      isLate: true,
      lateMinutes: 20,
    },
    {
      id: 'session-01_user-mhs-2',
      sessionId: 'session-01',
      labId: 'lab-01',
      studentId: 'user-mhs-2',
      status: 'PRESENT',
      checkedInAt: nowIso,
      isLate: true,
      lateMinutes: 18,
    },
  ];

  const fines: FineDoc[] = [
    {
      id: 'session-01_user-mhs-1',
      studentId: 'user-mhs-1',
      sessionId: 'session-01',
      labId: 'lab-01',
      amount: 15000,
      reason: 'Terlambat 20 menit',
      status: 'unpaid',
      createdAt: nowIso,
    },
    {
      id: 'session-01_user-mhs-2',
      studentId: 'user-mhs-2',
      sessionId: 'session-01',
      labId: 'lab-01',
      amount: 15000,
      reason: 'Terlambat 18 menit',
      status: 'paid',
      createdAt: nowIso,
      paidAt: nowIso,
    },
  ];

  return { users, courses, labs, labMembers, sessions, attendances, fines };
}

/**
 * Menuliskan Seed Data Sprint 4 ke Firestore (merge idempotent).
 * Catatan: Hanya dijalankan oleh Aslab saat kickoff / reset pengujian.
 */
export async function seedSprint4DataToFirestore(aslabUid?: string): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) return;

  const seed = getSprint4SeedSnapshot(aslabUid);
  const batch = writeBatch(db);

  for (const c of seed.courses) {
    batch.set(doc(db, ASLAB_COLLECTIONS.COURSES, c.id), stripUndefined(c), { merge: true });
  }
  for (const l of seed.labs) {
    batch.set(doc(db, ASLAB_COLLECTIONS.LABS, l.id), stripUndefined(l), { merge: true });
  }
  for (const m of seed.labMembers) {
    batch.set(doc(db, ASLAB_COLLECTIONS.LAB_MEMBERS, m.id), stripUndefined(m), { merge: true });
  }
  for (const u of seed.users) {
    batch.set(doc(db, ASLAB_COLLECTIONS.USERS, u.id), stripUndefined(u), { merge: true });
  }
  for (const s of seed.sessions) {
    batch.set(doc(db, ASLAB_COLLECTIONS.SESSIONS, s.id), stripUndefined(s), { merge: true });
  }
  for (const a of seed.attendances) {
    batch.set(doc(db, ASLAB_COLLECTIONS.ATTENDANCES, a.id), stripUndefined(a), { merge: true });
  }
  for (const f of seed.fines) {
    batch.set(doc(db, ASLAB_COLLECTIONS.FINES, f.id), stripUndefined(f), { merge: true });
  }

  await batch.commit();
}
