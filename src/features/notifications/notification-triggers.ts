import { addDoc, collection } from '@react-native-firebase/firestore';

import { firestore } from '@/services/firebase';
import type { NotificationDoc, NotificationType } from '@/features/notifications/types';

const NOTIFICATIONS_COLLECTION = 'notifications';

async function createNotificationDoc(params: {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
}): Promise<string> {
  const payload: Omit<NotificationDoc, 'id'> = {
    userId: params.userId,
    title: params.title,
    body: params.body,
    type: params.type,
    data: params.data,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(firestore, NOTIFICATIONS_COLLECTION), payload);
  return docRef.id;
}

export function notifyFineCreated(params: {
  studentId: string;
  fineId: string;
  sessionId: string;
  amount: number;
  reason: string;
}) {
  return createNotificationDoc({
    userId: params.studentId,
    title: 'Tagihan Denda Keterlambatan',
    body: `${params.reason}. Denda sebesar Rp${params.amount.toLocaleString('id-ID')} telah diterbitkan.`,
    type: 'fine_created',
    data: {
      fineId: params.fineId,
      sessionId: params.sessionId,
      amount: params.amount,
    },
  });
}

export function notifyPaymentSuccess(params: {
  studentId: string;
  fineId: string;
  orderId: string;
  amount: number;
}) {
  return createNotificationDoc({
    userId: params.studentId,
    title: 'Pembayaran Denda Berhasil',
    body: `Pembayaran denda sebesar Rp${params.amount.toLocaleString('id-ID')} telah lunas (${params.orderId}).`,
    type: 'payment_success',
    data: {
      fineId: params.fineId,
      orderId: params.orderId,
      amount: params.amount,
    },
  });
}

export function notifyPaymentFailed(params: {
  studentId: string;
  fineId: string;
  orderId: string;
  amount: number;
}) {
  return createNotificationDoc({
    userId: params.studentId,
    title: 'Pembayaran Denda Gagal',
    body: `Transaksi ${params.orderId} gagal atau kedaluwarsa. Silakan lakukan pembayaran ulang.`,
    type: 'payment_failed',
    data: {
      fineId: params.fineId,
      orderId: params.orderId,
      amount: params.amount,
    },
  });
}
