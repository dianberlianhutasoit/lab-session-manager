import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

/**
 * Konfigurasi handler notifikasi saat aplikasi berada di latar depan (foreground).
 * Memastikan suara, getaran, dan alert pop-up tetap aktif.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
}

export interface PushNotificationResult {
  success: boolean;
  response?: unknown;
  error?: string;
}

/**
 * Mengecek apakah izin notifikasi saat ini telah diberikan (granted) oleh pengguna.
 */
export async function checkNotificationPermissionAsync(): Promise<boolean> {
  if (!Device.isDevice) {
    return true;
  }
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.warn('[NotificationService] Gagal memeriksa status izin notifikasi:', error);
    return false;
  }
}

/**
 * Meminta izin pengguna dan mendaftarkan perangkat untuk menerima push notification.
 * Mengembalikan ExpoPushToken (string) jika berhasil, atau null jika gagal/ditolak.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // 1. Khusus Android: Atur notification channel wajib (Android 8.0+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Notifications',
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
      sound: 'default',
    });
  }

  // 2. Verifikasi apakah berjalan di perangkat fisik
  if (!Device.isDevice) {
    console.warn(
      '[NotificationService] Push notification hanya dapat dijalankan pada perangkat fisik.'
    );
    return null;
  }

  // 3. Periksa dan minta izin pengguna
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NotificationService] Izin akses notifikasi ditolak oleh pengguna.');
      return null;
    }

    // 4. Ambil Project ID dari EAS Config / App Config
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = pushTokenData.data;
  } catch (error) {
    console.error('[NotificationService] Gagal mendapatkan Expo Push Token:', error);
    return null;
  }

  return token;
}

/**
 * Mengirim push notification ke satu atau beberapa perangkat melalui Expo Push Service.
 * Endpoint resmi: https://exp.host/--/api/v2/push/send
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<PushNotificationResult> {
  const targetTokens: string[] = Array.isArray(payload.to)
    ? payload.to.filter((t) => typeof t === 'string' && t.trim().length > 0)
    : payload.to && typeof payload.to === 'string' && payload.to.trim().length > 0
      ? [payload.to.trim()]
      : [];

  if (targetTokens.length === 0) {
    return {
      success: false,
      error: 'Tidak ada token push notification tujuan yang valid.',
    };
  }

  const messages = targetTokens.map((token) => ({
    to: token,
    sound: payload.sound ?? 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    priority: payload.priority ?? 'high',
    channelId: 'default',
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[NotificationService] Gagal mengirim push notification:', response.status, errText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errText}`,
      };
    }

    const data = await response.json();
    return { success: true, response: data };
  } catch (error) {
    console.error('[NotificationService] Kesalahan jaringan saat mengirim notifikasi:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Kesalahan jaringan tidak diketahui',
    };
  }
}

/**
 * Menyiapkan listener notifikasi untuk menangani pesan saat diterima dan saat ditekan (tap).
 * Mengembalikan fungsi cleanup untuk membatalkan subscription saat unmount.
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      if (onNotificationResponse) {
        onNotificationResponse(response);
      } else {
        // Navigasi otomatis default jika ada payload `screen` atau `url`
        const data = response.notification.request.content.data;
        if (data && typeof data === 'object') {
          const targetScreen =
            (data as { screen?: string; url?: string }).screen ??
            (data as { screen?: string; url?: string }).url;

          if (targetScreen && typeof targetScreen === 'string') {
            try {
              // Navigasi ke rute tujuan menggunakan Expo Router
              router.push(targetScreen as any);
            } catch (navError) {
              console.error(
                '[NotificationService] Gagal melakukan navigasi ke rute dari notifikasi:',
                navError
              );
            }
          }
        }
      }
    }
  );

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
