import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';

import { useAuth } from '@/context/auth-context';
import { firestore } from '@/services/firebase';
import type { NotificationDoc } from '@/features/notifications/types';

const NOTIFICATIONS_COLLECTION = 'notifications';

function sortByCreatedAtDesc(items: NotificationDoc[]): NotificationDoc[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function useNotifications() {
  const { profile } = useAuth();
  const userId = profile?.id;

  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const notificationsQuery = query(
      collection(firestore, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const items: NotificationDoc[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<NotificationDoc, 'id'>),
        }));
        setNotifications(sortByCreatedAtDesc(items));
        setError(null);
        setLoadedUserId(userId);
      },
      (err) => {
        console.warn('[Notifications] Gagal mendengarkan notifikasi:', err);
        setError('Gagal memuat notifikasi.');
        setLoadedUserId(userId);
      },
    );

    return unsubscribe;
  }, [userId]);

  const activeNotifications = useMemo(
    () => (userId ? notifications : []),
    [userId, notifications],
  );
  const loading = Boolean(userId) && loadedUserId !== userId;

  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    setError(null);
    try {
      const notificationsQuery = query(
        collection(firestore, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
      );
      const snapshot = await getDocs(notificationsQuery);
      const items: NotificationDoc[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<NotificationDoc, 'id'>),
      }));
      setNotifications(sortByCreatedAtDesc(items));
    } catch (err) {
      console.warn('[Notifications] Gagal menyegarkan notifikasi:', err);
      setError('Gagal menyegarkan notifikasi.');
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item,
      ),
    );
    try {
      await updateDoc(doc(firestore, NOTIFICATIONS_COLLECTION, notificationId), {
        isRead: true,
      });
    } catch (err) {
      console.warn('[Notifications] Gagal menandai notifikasi dibaca:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadItems = notifications.filter((item) => !item.isRead);
    if (unreadItems.length === 0) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    try {
      const batch = writeBatch(firestore);
      for (const item of unreadItems) {
        batch.update(doc(firestore, NOTIFICATIONS_COLLECTION, item.id), {
          isRead: true,
        });
      }
      await batch.commit();
    } catch (err) {
      console.warn('[Notifications] Gagal menandai semua notifikasi dibaca:', err);
    }
  }, [notifications]);

  const unreadCount = useMemo(
    () => activeNotifications.filter((item) => !item.isRead).length,
    [activeNotifications],
  );

  return {
    notifications: activeNotifications,
    unreadCount,
    loading,
    refreshing,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  };
}
