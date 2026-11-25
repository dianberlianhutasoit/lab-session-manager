import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/auth-context';
import type {
  CourseDoc,
  FineDoc,
  LabDoc,
  LabMemberDoc,
  SprintAttendanceDoc,
  SprintSessionDoc,
  User,
} from '@/types';
import {
  ASLAB_COLLECTIONS,
  assignSingleLabMemberInFirestore,
  bulkAssignLabMembersInFirestore,
  bulkCreateLabsInFirestore,
  createCourseInFirestore,
  createLabInFirestore,
  deleteCourseInFirestore,
  deleteLabInFirestore,
  getSprint4SeedSnapshot,
  normalizeLabDoc,
  normalizeUserDoc,
  removeLabMemberInFirestore,
  seedSprint4DataToFirestore,
  subscribeAslabCollection,
  transferLabMemberInFirestore,
  updateCourseInFirestore,
  updateLabInFirestore,
} from './aslab-firestore';
import type { AslabLabFormInput, CourseFormInput, TransferMemberPayload } from './types';

interface AslabContextValue {
  courses: CourseDoc[];
  labs: LabDoc[];
  labMembers: LabMemberDoc[];
  users: User[];
  sessions: SprintSessionDoc[];
  attendances: SprintAttendanceDoc[];
  fines: FineDoc[];
  loading: boolean;
  isLiveConnected: boolean;
  error: string | null;
  createCourse: (input: CourseFormInput) => Promise<CourseDoc>;
  updateCourse: (courseId: string, input: CourseFormInput) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  createLab: (input: AslabLabFormInput) => Promise<LabDoc>;
  updateLab: (labId: string, input: AslabLabFormInput) => Promise<LabDoc>;
  deleteLab: (labId: string) => Promise<void>;
  bulkCreateLabs: (
    courseId: string,
    inputs: Omit<AslabLabFormInput, 'courseId'>[]
  ) => Promise<LabDoc[]>;
  assignMember: (labId: string, userId: string, role: LabMemberDoc['role']) => Promise<LabMemberDoc>;
  bulkAssignMembers: (
    labId: string,
    role: LabMemberDoc['role'],
    userIds: string[]
  ) => Promise<LabMemberDoc[]>;
  removeMember: (labId: string, userId: string) => Promise<void>;
  transferMember: (payload: TransferMemberPayload) => Promise<LabMemberDoc>;
  seedKickoffData: () => Promise<void>;
}

const AslabContext = createContext<AslabContextValue | undefined>(undefined);

export function AslabProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const initialSeed = useMemo(() => getSprint4SeedSnapshot(profile?.id), [profile?.id]);

  const [courses, setCourses] = useState<CourseDoc[]>(
    Platform.OS === 'web' ? initialSeed.courses : []
  );
  const [labs, setLabs] = useState<LabDoc[]>(Platform.OS === 'web' ? initialSeed.labs : []);
  const [labMembers, setLabMembers] = useState<LabMemberDoc[]>(
    Platform.OS === 'web' ? initialSeed.labMembers : []
  );
  const [users, setUsers] = useState<User[]>(Platform.OS === 'web' ? initialSeed.users : []);
  const [sessions, setSessions] = useState<SprintSessionDoc[]>(
    Platform.OS === 'web' ? initialSeed.sessions : []
  );
  const [attendances, setAttendances] = useState<SprintAttendanceDoc[]>(
    Platform.OS === 'web' ? initialSeed.attendances : []
  );
  const [fines, setFines] = useState<FineDoc[]>(Platform.OS === 'web' ? initialSeed.fines : []);

  const [loading, setLoading] = useState<boolean>(Platform.OS !== 'web');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const unsubs: (() => void)[] = [];
    const onConnected = () => {
      setIsLiveConnected(true);
      setLoading(false);
    };
    const onErr = (err: Error) => {
      setError(err.message);
      setLoading(false);
    };

    unsubs.push(
      subscribeAslabCollection<CourseDoc>(
        ASLAB_COLLECTIONS.COURSES,
        (id, data) => ({
          id,
          code: typeof data.code === 'string' ? data.code : 'MK',
          name: typeof data.name === 'string' ? data.name : 'Mata Kuliah',
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
        }),
        (items) => {
          setCourses(items);
          onConnected();
        },
        onErr
      )
    );

    unsubs.push(
      subscribeAslabCollection<LabDoc>(
        ASLAB_COLLECTIONS.LABS,
        normalizeLabDoc,
        (items) => {
          setLabs(items);
          onConnected();
        },
        onErr
      )
    );

    unsubs.push(
      subscribeAslabCollection<LabMemberDoc>(
        ASLAB_COLLECTIONS.LAB_MEMBERS,
        (id, data) => ({
          id,
          labId: typeof data.labId === 'string' ? data.labId : '',
          userId: typeof data.userId === 'string' ? data.userId : '',
          role: data.role === 'asprak' ? 'asprak' : 'praktikan',
          assignedAt: typeof data.assignedAt === 'string' ? data.assignedAt : '',
        }),
        (items) => {
          setLabMembers(items);
          onConnected();
        },
        onErr
      )
    );

    unsubs.push(
      subscribeAslabCollection<User>(
        ASLAB_COLLECTIONS.USERS,
        normalizeUserDoc,
        (items) => {
          setUsers(items);
          onConnected();
        },
        onErr
      )
    );

    unsubs.push(
      subscribeAslabCollection<SprintSessionDoc>(
        ASLAB_COLLECTIONS.SESSIONS,
        (id, data) => ({
          id,
          labId: typeof data.labId === 'string' ? data.labId : '',
          courseId: typeof data.courseId === 'string' ? data.courseId : '',
          asprakId:
            typeof data.asprakId === 'string'
              ? data.asprakId
              : typeof data.assistantId === 'string'
              ? data.assistantId
              : '',
          title: typeof data.title === 'string' ? data.title : `Sesi ${id}`,
          sessionNumber: typeof data.sessionNumber === 'number' ? data.sessionNumber : 1,
          startAt:
            typeof data.startAt === 'string'
              ? data.startAt
              : typeof data.openedAt === 'string'
              ? data.openedAt
              : typeof data.createdAt === 'string'
              ? data.createdAt
              : new Date().toISOString(),
          endAt:
            typeof data.endAt === 'string'
              ? data.endAt
              : typeof data.closedAt === 'string'
              ? data.closedAt
              : new Date().toISOString(),
          status:
            data.status === 'OPEN' || data.status === 'CLOSED' || data.status === 'SCHEDULED'
              ? data.status
              : 'SCHEDULED',
          openedAt: typeof data.openedAt === 'string' ? data.openedAt : undefined,
          closedAt: typeof data.closedAt === 'string' ? data.closedAt : undefined,
          configSnapshot: data.configSnapshot as SprintSessionDoc['configSnapshot'],
          scheduleId: typeof data.scheduleId === 'string' ? data.scheduleId : undefined,
          assistantId: typeof data.assistantId === 'string' ? data.assistantId : undefined,
        }),
        (items) => {
          setSessions(items);
          onConnected();
        },
        onErr
      )
    );

    unsubs.push(
      subscribeAslabCollection<SprintAttendanceDoc>(
        ASLAB_COLLECTIONS.ATTENDANCES,
        (id, data) => ({
          id,
          sessionId: typeof data.sessionId === 'string' ? data.sessionId : '',
          labId: typeof data.labId === 'string' ? data.labId : '',
          studentId:
            typeof data.studentId === 'string'
              ? data.studentId
              : typeof data.userId === 'string'
              ? data.userId
              : '',
          status:
            data.status === 'PRESENT' || data.status === 'EXCUSED' || data.status === 'ABSENT'
              ? data.status
              : 'PRESENT',
          checkedInAt:
            typeof data.checkedInAt === 'string'
              ? data.checkedInAt
              : typeof data.recordedAt === 'string'
              ? data.recordedAt
              : new Date().toISOString(),
          isLate: Boolean(data.isLate),
          lateMinutes: typeof data.lateMinutes === 'number' ? data.lateMinutes : 0,
        }),
        (items) => {
          setAttendances(items);
          onConnected();
        }
      )
    );

    unsubs.push(
      subscribeAslabCollection<FineDoc>(
        ASLAB_COLLECTIONS.FINES,
        (id, data) => ({
          id,
          studentId: typeof data.studentId === 'string' ? data.studentId : '',
          sessionId: typeof data.sessionId === 'string' ? data.sessionId : '',
          labId: typeof data.labId === 'string' ? data.labId : '',
          amount: typeof data.amount === 'number' ? data.amount : 0,
          reason: typeof data.reason === 'string' ? data.reason : 'Keterlambatan praktikum',
          status:
            data.status === 'paid' ||
            data.status === 'pending' ||
            data.status === 'waived' ||
            data.status === 'unpaid'
              ? data.status
              : 'unpaid',
          createdAt:
            typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
          paidAt: typeof data.paidAt === 'string' ? data.paidAt : undefined,
        }),
        (items) => {
          setFines(items);
          onConnected();
        }
      )
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  const aslabId = profile?.id ?? 'user-aslab-1';

  const createCourse = useCallback(async (input: CourseFormInput) => {
    const created = await createCourseInFirestore(input);
    if (Platform.OS === 'web') {
      setCourses((prev) => [created, ...prev]);
    }
    return created;
  }, []);

  const updateCourse = useCallback(async (courseId: string, input: CourseFormInput) => {
    await updateCourseInFirestore(courseId, input);
    if (Platform.OS === 'web') {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? { ...c, code: input.code.trim().toUpperCase(), name: input.name.trim() }
            : c
        )
      );
    }
  }, []);

  const deleteCourse = useCallback(async (courseId: string) => {
    await deleteCourseInFirestore(courseId);
    if (Platform.OS === 'web') {
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    }
  }, []);

  const createLab = useCallback(
    async (input: AslabLabFormInput) => {
      const created = await createLabInFirestore(aslabId, input);
      if (Platform.OS === 'web') {
        setLabs((prev) => [created, ...prev]);
      }
      return created;
    },
    [aslabId]
  );

  const updateLab = useCallback(
    async (labId: string, input: AslabLabFormInput) => {
      const existing = labs.find((l) => l.id === labId);
      const updated = await updateLabInFirestore(labId, aslabId, input, existing?.createdAt);
      if (Platform.OS === 'web') {
        setLabs((prev) => prev.map((l) => (l.id === labId ? updated : l)));
      }
      return updated;
    },
    [aslabId, labs]
  );

  const deleteLab = useCallback(async (labId: string) => {
    await deleteLabInFirestore(labId);
    if (Platform.OS === 'web') {
      setLabs((prev) => prev.filter((l) => l.id !== labId));
      setLabMembers((prev) => prev.filter((m) => m.labId !== labId));
    }
  }, []);

  const bulkCreateLabs = useCallback(
    async (courseId: string, inputs: Omit<AslabLabFormInput, 'courseId'>[]) => {
      const created = await bulkCreateLabsInFirestore(aslabId, courseId, inputs);
      if (Platform.OS === 'web') {
        setLabs((prev) => [...created, ...prev]);
      }
      return created;
    },
    [aslabId]
  );

  const assignMember = useCallback(
    async (labId: string, userId: string, role: LabMemberDoc['role']) => {
      const created = await assignSingleLabMemberInFirestore(labId, userId, role);
      if (Platform.OS === 'web') {
        setLabMembers((prev) => {
          const filtered = prev.filter((m) => m.id !== created.id);
          return [created, ...filtered];
        });
      }
      return created;
    },
    []
  );

  const bulkAssignMembers = useCallback(
    async (labId: string, role: LabMemberDoc['role'], userIds: string[]) => {
      const assigned = await bulkAssignLabMembersInFirestore(labId, role, userIds);
      if (Platform.OS === 'web') {
        setLabMembers((prev) => {
          const ids = new Set(assigned.map((a) => a.id));
          return [...assigned, ...prev.filter((m) => !ids.has(m.id))];
        });
      }
      return assigned;
    },
    []
  );

  const removeMember = useCallback(async (labId: string, userId: string) => {
    await removeLabMemberInFirestore(labId, userId);
    if (Platform.OS === 'web') {
      const targetId = `${labId}_${userId}`;
      setLabMembers((prev) => prev.filter((m) => m.id !== targetId));
    }
  }, []);

  const transferMember = useCallback(async (payload: TransferMemberPayload) => {
    const moved = await transferLabMemberInFirestore(payload);
    if (Platform.OS === 'web') {
      const oldId = `${payload.fromLabId}_${payload.userId}`;
      setLabMembers((prev) => [
        moved,
        ...prev.filter((m) => m.id !== oldId && m.id !== moved.id),
      ]);
    }
    return moved;
  }, []);

  const seedKickoffData = useCallback(async () => {
    if (Platform.OS === 'web') {
      const snap = getSprint4SeedSnapshot(aslabId);
      setUsers(snap.users);
      setCourses(snap.courses);
      setLabs(snap.labs);
      setLabMembers(snap.labMembers);
      setSessions(snap.sessions);
      setAttendances(snap.attendances);
      setFines(snap.fines);
      return;
    }
    await seedSprint4DataToFirestore(aslabId);
  }, [aslabId]);

  const value = useMemo<AslabContextValue>(
    () => ({
      courses,
      labs,
      labMembers,
      users,
      sessions,
      attendances,
      fines,
      loading,
      isLiveConnected,
      error,
      createCourse,
      updateCourse,
      deleteCourse,
      createLab,
      updateLab,
      deleteLab,
      bulkCreateLabs,
      assignMember,
      bulkAssignMembers,
      removeMember,
      transferMember,
      seedKickoffData,
    }),
    [
      courses,
      labs,
      labMembers,
      users,
      sessions,
      attendances,
      fines,
      loading,
      isLiveConnected,
      error,
      createCourse,
      updateCourse,
      deleteCourse,
      createLab,
      updateLab,
      deleteLab,
      bulkCreateLabs,
      assignMember,
      bulkAssignMembers,
      removeMember,
      transferMember,
      seedKickoffData,
    ]
  );

  return <AslabContext.Provider value={value}>{children}</AslabContext.Provider>;
}

export function useAslab() {
  const ctx = useContext(AslabContext);
  if (!ctx) {
    throw new Error('useAslab must be used inside AslabProvider');
  }
  return ctx;
}
