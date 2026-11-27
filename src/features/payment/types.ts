export type FineStatus = 'unpaid' | 'pending' | 'paid' | 'waived';

/**
 * Kontrak Skema Firestore: fines/{sessionId_studentId}
 */
export interface FineDoc {
  id: string;
  studentId: string;
  sessionId: string;
  labId: string;
  amount: number;
  reason: string;
  status: FineStatus;
  createdAt: string;
  paidAt?: string;
}

export type PaymentStatus = 'pending' | 'success' | 'failed';

/**
 * Kontrak Skema Firestore: payments/{paymentId} (Owned by Dev C)
 */
export interface PaymentDoc {
  id: string;
  fineId: string;
  studentId: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  snapToken: string;
  redirectUrl: string;
  createdAt: string;
  settledAt?: string;
}

/**
 * Subset read-only dari sessions/{sessionId} untuk menampilkan info sesi terkait
 */
export interface PaymentSessionInfo {
  id: string;
  title?: string;
  sessionNumber?: number;
  startAt?: string;
  labId?: string;
  courseId?: string;
}

export interface FineWithSession extends FineDoc {
  sessionTitle: string;
  sessionDate?: string;
}

export interface PaymentWithSession extends PaymentDoc {
  sessionTitle: string;
  fineReason?: string;
}

export type PaymentScreenTab = 'BILLS' | 'HISTORY';
