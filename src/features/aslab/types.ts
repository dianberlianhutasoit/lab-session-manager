import type { LabDoc, LabMemberDoc } from '@/types';

export type DashboardRange = 'today' | 'week' | 'month';

export type BulkImportType = 'labs' | 'praktikan' | 'asprak';

export type BulkTemplateFormat = 'csv' | 'xlsx';

export type BulkRowDecision = 'accepted' | 'denied';

export interface CourseFormInput {
  code: string;
  name: string;
}

export interface AslabLabFormInput {
  courseId: string;
  name: string;
  building: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  gracePeriodMinutes: number;
  lateFineAmount: number;
  capacity?: number;
  description?: string;
}

export interface BulkLabRow {
  rowId: string;
  rowNumber: number;
  decision: BulkRowDecision;
  name: string;
  building: string;
  address: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
  gracePeriodMinutes: string;
  lateFineAmount: string;
  errors: string[];
}

export interface BulkMemberRow {
  rowId: string;
  rowNumber: number;
  decision: BulkRowDecision;
  userId: string;
  email: string;
  nim: string;
  name: string;
  matchedUserId: string | null;
  matchedUserName: string | null;
  matchedUserRole: string | null;
  errors: string[];
}

export interface TransferMemberPayload {
  fromLabId: string;
  toLabId: string;
  userId: string;
  role: LabMemberDoc['role'];
}

export interface LabWithStats {
  lab: LabDoc;
  courseCode: string;
  courseName: string;
  praktikanCount: number;
  asprakCount: number;
}
