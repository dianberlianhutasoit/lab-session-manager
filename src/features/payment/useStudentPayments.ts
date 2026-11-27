import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from '@react-native-firebase/firestore';

import { useAuth } from '@/context/auth-context';
import { firestore } from '@/services/firebase';
import type {
  FineDoc,
  FineWithSession,
  PaymentDoc,
  PaymentSessionInfo,
  PaymentWithSession,
} from '@/features/payment/types';

const FINES_COLLECTION = 'fines';
const PAYMENTS_COLLECTION = 'payments';
const SESSIONS_COLLECTION = 'sessions';

function sortByDateDesc<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function useStudentPayments() {
  const { profile } = useAuth();
  const studentId = profile?.id;

  const [fines, setFines] = useState<FineDoc[]>([]);
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [sessionsMap, setSessionsMap] = useState<Record<string, PaymentSessionInfo>>({});
  const [loadedFinesFor, setLoadedFinesFor] = useState<string | null>(null);
  const [loadedPaymentsFor, setLoadedPaymentsFor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener untuk koleksi fines milik praktikan
  useEffect(() => {
    if (!studentId) return;

    const finesQuery = query(
      collection(firestore, FINES_COLLECTION),
      where('studentId', '==', studentId),
    );

    const unsubscribe = onSnapshot(
      finesQuery,
      (snapshot) => {
        const items: FineDoc[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FineDoc, 'id'>),
        }));
        setFines(sortByDateDesc(items));
        setError(null);
        setLoadedFinesFor(studentId);
      },
      (err) => {
        console.warn('[Payment] Gagal memuat data denda:', err);
        setError('Gagal memuat daftar tagihan denda.');
        setLoadedFinesFor(studentId);
      },
    );

    return unsubscribe;
  }, [studentId]);

  // Real-time listener untuk koleksi payments milik praktikan
  useEffect(() => {
    if (!studentId) return;

    const paymentsQuery = query(
      collection(firestore, PAYMENTS_COLLECTION),
      where('studentId', '==', studentId),
    );

    const unsubscribe = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        const items: PaymentDoc[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PaymentDoc, 'id'>),
        }));
        setPayments(sortByDateDesc(items));
        setError(null);
        setLoadedPaymentsFor(studentId);
      },
      (err) => {
        console.warn('[Payment] Gagal memuat riwayat pembayaran:', err);
        setError('Gagal memuat riwayat pembayaran.');
        setLoadedPaymentsFor(studentId);
      },
    );

    return unsubscribe;
  }, [studentId]);

  // Read-only listener untuk sessions agar nama & tanggal sesi bisa ditampilkan
  useEffect(() => {
    if (!studentId) return;

    const unsubscribe = onSnapshot(
      collection(firestore, SESSIONS_COLLECTION),
      (snapshot) => {
        const map: Record<string, PaymentSessionInfo> = {};
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as Omit<PaymentSessionInfo, 'id'>;
          map[docSnap.id] = { id: docSnap.id, ...data };
        });
        setSessionsMap(map);
      },
      (err) => {
        console.warn('[Payment] Gagal memuat info sesi:', err);
      },
    );

    return unsubscribe;
  }, [studentId]);

  const refresh = useCallback(async () => {
    if (!studentId) return;
    setRefreshing(true);
    setError(null);
    try {
      const [finesSnap, paymentsSnap, sessionsSnap] = await Promise.all([
        getDocs(query(collection(firestore, FINES_COLLECTION), where('studentId', '==', studentId))),
        getDocs(query(collection(firestore, PAYMENTS_COLLECTION), where('studentId', '==', studentId))),
        getDocs(collection(firestore, SESSIONS_COLLECTION)),
      ]);

      setFines(
        sortByDateDesc(
          finesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FineDoc, 'id'>) })),
        ),
      );
      setPayments(
        sortByDateDesc(
          paymentsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PaymentDoc, 'id'>) })),
        ),
      );

      const map: Record<string, PaymentSessionInfo> = {};
      sessionsSnap.docs.forEach((d) => {
        map[d.id] = { id: d.id, ...(d.data() as Omit<PaymentSessionInfo, 'id'>) };
      });
      setSessionsMap(map);
    } catch (err) {
      console.warn('[Payment] Gagal menyegarkan data pembayaran:', err);
      setError('Gagal menyegarkan data tagihan & pembayaran.');
    } finally {
      setRefreshing(false);
    }
  }, [studentId]);

  const activeFines: FineWithSession[] = useMemo(() => {
    if (!studentId) return [];
    return fines
      .filter((fine) => fine.status === 'unpaid' || fine.status === 'pending')
      .map((fine) => {
        const session = sessionsMap[fine.sessionId];
        const fallbackTitle = `Sesi ${fine.sessionId}`;
        return {
          ...fine,
          sessionTitle: session?.title || fallbackTitle,
          sessionDate: session?.startAt,
        };
      });
  }, [studentId, fines, sessionsMap]);

  const paymentHistory: PaymentWithSession[] = useMemo(() => {
    if (!studentId) return [];
    const finesById = new Map(fines.map((f) => [f.id, f]));

    return payments.map((payment) => {
      const fine = finesById.get(payment.fineId);
      const session = fine ? sessionsMap[fine.sessionId] : undefined;
      const sessionTitle = session?.title || (fine ? `Sesi ${fine.sessionId}` : `Tagihan ${payment.fineId}`);

      return {
        ...payment,
        sessionTitle,
        fineReason: fine?.reason,
      };
    });
  }, [studentId, payments, fines, sessionsMap]);

  const totalUnpaidAmount = useMemo(
    () => activeFines.reduce((sum, fine) => sum + fine.amount, 0),
    [activeFines],
  );

  const loading =
    Boolean(studentId) &&
    (loadedFinesFor !== studentId || loadedPaymentsFor !== studentId);

  return {
    activeFines,
    paymentHistory,
    totalUnpaidAmount,
    loading,
    refreshing,
    error,
    refresh,
  };
}
