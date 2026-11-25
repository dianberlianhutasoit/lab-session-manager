import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

import {
  createSnapTransaction,
  verifyMidtransSignature,
} from './midtrans-client.js';

type PaymentStatus = 'pending' | 'success' | 'failed';

function getMidtransServerKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) {
    throw new Error('MIDTRANS_SERVER_KEY belum dikonfigurasi di server environment.');
  }
  return key;
}

function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string,
): PaymentStatus {
  if (transactionStatus === 'settlement') {
    return 'success';
  }
  if (transactionStatus === 'capture') {
    return fraudStatus === 'challenge' ? 'pending' : 'success';
  }
  if (transactionStatus === 'pending') {
    return 'pending';
  }
  if (
    transactionStatus === 'deny' ||
    transactionStatus === 'cancel' ||
    transactionStatus === 'expire' ||
    transactionStatus === 'failure'
  ) {
    return 'failed';
  }
  return 'pending';
}

/**
 * POST /api/payment/charge
 * Body: { fineId: string; studentId: string }
 */
export async function handleChargePayment(req: Request, res: Response) {
  try {
    const { fineId, studentId } = req.body as {
      fineId?: string;
      studentId?: string;
    };

    if (!fineId || !studentId) {
      res.status(400).json({ error: 'fineId dan studentId wajib diisi.' });
      return;
    }

    const db = getFirestore();
    const fineRef = db.collection('fines').doc(fineId);
    const fineSnap = await fineRef.get();

    if (!fineSnap.exists) {
      res.status(404).json({ error: 'Tagihan denda tidak ditemukan.' });
      return;
    }

    const fineData = fineSnap.data() as {
      studentId: string;
      sessionId: string;
      amount: number;
      reason: string;
      status: string;
    };

    if (fineData.studentId !== studentId) {
      res.status(403).json({ error: 'Tagihan ini bukan milik praktikan tersebut.' });
      return;
    }

    if (fineData.status === 'paid' || fineData.status === 'waived') {
      res.status(400).json({
        error: `Tagihan sudah berstatus "${fineData.status}" dan tidak perlu dibayar.`,
      });
      return;
    }

    const userSnap = await db.collection('users').doc(studentId).get();
    const userData = userSnap.exists
      ? (userSnap.data() as { name?: string; email?: string })
      : undefined;

    const attemptTimestamp = Date.now();
    const orderId = `${fineId}-${attemptTimestamp}`;
    const serverKey = getMidtransServerKey();

    const snap = await createSnapTransaction(
      {
        orderId,
        grossAmount: fineData.amount,
        customerName: userData?.name,
        customerEmail: userData?.email,
        itemId: fineId,
        itemName: `Denda ${fineData.sessionId}: ${fineData.reason}`,
      },
      serverKey,
    );

    const now = new Date().toISOString();
    const paymentRef = db.collection('payments').doc(orderId);

    await paymentRef.set({
      id: orderId,
      fineId,
      studentId,
      orderId,
      amount: fineData.amount,
      status: 'pending',
      snapToken: snap.token,
      redirectUrl: snap.redirect_url,
      createdAt: now,
    });

    await fineRef.update({ status: 'pending' });

    res.status(200).json({
      paymentId: orderId,
      orderId,
      snapToken: snap.token,
      redirectUrl: snap.redirect_url,
      amount: fineData.amount,
    });
  } catch (error) {
    console.error('[Payment Charge Error]', error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Gagal membuat transaksi pembayaran Midtrans.',
    });
  }
}

/**
 * POST /api/payment/notification
 * Webhook callback dari Midtrans Sandbox
 */
export async function handleMidtransNotification(req: Request, res: Response) {
  try {
    const body = req.body as {
      order_id?: string;
      status_code?: string;
      gross_amount?: string;
      signature_key?: string;
      transaction_status?: string;
      fraud_status?: string;
    };

    const {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
    } = body;

    if (!orderId || !statusCode || !grossAmount || !signatureKey || !transactionStatus) {
      res.status(400).json({ error: 'Payload webhook Midtrans tidak lengkap.' });
      return;
    }

    const serverKey = getMidtransServerKey();
    const isValidSignature = verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      serverKey,
      signatureKey,
    });

    if (!isValidSignature) {
      res.status(403).json({ error: 'Signature Midtrans tidak valid.' });
      return;
    }

    const db = getFirestore();
    const paymentRef = db.collection('payments').doc(orderId);
    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      res.status(404).json({ error: 'Dokumen pembayaran tidak ditemukan.' });
      return;
    }

    const paymentData = paymentSnap.data() as {
      fineId: string;
      studentId: string;
      amount: number;
      status: PaymentStatus;
    };

    const nextStatus = mapMidtransStatus(transactionStatus, fraudStatus);
    const now = new Date().toISOString();

    await paymentRef.update({
      status: nextStatus,
      ...(nextStatus === 'success' ? { settledAt: now } : {}),
    });

    const fineRef = db.collection('fines').doc(paymentData.fineId);

    if (nextStatus === 'success') {
      // Pembayaran lunas -> update fines/{fineId} tanpa pernah mengubah catatan kehadiran
      await fineRef.update({
        status: 'paid',
        paidAt: now,
      });

      await db.collection('notifications').add({
        userId: paymentData.studentId,
        title: 'Pembayaran Denda Berhasil',
        body: `Pembayaran denda sebesar Rp${paymentData.amount.toLocaleString('id-ID')} telah lunas (${orderId}).`,
        type: 'payment_success',
        data: {
          fineId: paymentData.fineId,
          orderId,
          amount: paymentData.amount,
        },
        isRead: false,
        createdAt: now,
      });
    } else if (nextStatus === 'failed') {
      const fineSnap = await fineRef.get();
      if (fineSnap.exists && fineSnap.data()?.status === 'pending') {
        await fineRef.update({ status: 'unpaid' });
      }

      await db.collection('notifications').add({
        userId: paymentData.studentId,
        title: 'Pembayaran Denda Gagal',
        body: `Transaksi ${orderId} gagal atau kedaluwarsa. Silakan lakukan pembayaran ulang.`,
        type: 'payment_failed',
        data: {
          fineId: paymentData.fineId,
          orderId,
          amount: paymentData.amount,
        },
        isRead: false,
        createdAt: now,
      });
    }

    res.status(200).json({ received: true, orderId, status: nextStatus });
  } catch (error) {
    console.error('[Payment Webhook Error]', error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Gagal memproses notifikasi Midtrans.',
    });
  }
}
