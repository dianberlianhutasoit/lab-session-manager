import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/context/auth-context';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { OfflineBanner } from '@/components/common/offline-banner';
import { SessionProvider } from '@/context/session-context';
import { setupNotificationListeners } from '@/services/notification-service';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return () => {
      cleanup();
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SessionProvider>
          <AnimatedSplashOverlay />
          <OfflineBanner />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
          </Stack>
        </SessionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
