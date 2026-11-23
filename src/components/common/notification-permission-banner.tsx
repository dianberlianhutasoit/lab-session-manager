import { doc, updateDoc } from '@react-native-firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { firestore } from '@/services/firebase';
import {
  checkNotificationPermissionAsync,
  registerForPushNotificationsAsync,
} from '@/services/notification-service';

export function NotificationPermissionBanner() {
  const { status, profile } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const verifyPermission = async () => {
      // Hanya cek jika di perangkat native dan user sudah login
      if (Platform.OS === 'web' || status !== 'authenticated') {
        return;
      }
      const granted = await checkNotificationPermissionAsync();
      if (isMounted) {
        setHasPermission(granted);
      }
    };

    void verifyPermission();
    return () => {
      isMounted = false;
    };
  }, [status]);

  if (hasPermission || isDismissed || status !== 'authenticated') {
    return null;
  }

  const handleEnableNotification = async () => {
    setIsRequesting(true);
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setHasPermission(true);
        if (profile?.id) {
          await updateDoc(doc(firestore, 'users', profile.id), {
            expoPushToken: token,
          });
        }
      }
    } catch (error) {
      console.warn('[NotificationPermissionBanner] Gagal meminta izin notifikasi:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.content}>
        <ThemedText style={styles.icon}>🔔</ThemedText>
        <View style={styles.textContainer}>
          <ThemedText type="smallBold" style={styles.title}>
            Izin Notifikasi Belum Aktif
          </ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Aktifkan notifikasi agar Anda mendapatkan pemberitahuan saat sesi praktikum dibuka atau izin Anda diputuskan.
          </ThemedText>
        </View>
      </View>
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.enableButton}
          onPress={handleEnableNotification}
          disabled={isRequesting}
        >
          <ThemedText type="smallBold" style={styles.enableButtonText}>
            {isRequesting ? 'Memproses...' : 'Aktifkan'}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => setIsDismissed(true)}
        >
          <ThemedText type="small" style={styles.dismissButtonText}>
            ✕
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    width: '100%',
    zIndex: 9998,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  icon: {
    fontSize: 20,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#1E40AF',
  },
  subtitle: {
    color: '#3B82F6',
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  enableButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 6,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  dismissButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  dismissButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
});
