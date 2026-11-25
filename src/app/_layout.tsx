import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";

import { useEffect } from "react";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { NotificationPermissionBanner } from "@/components/common/notification-permission-banner";
import { OfflineBanner } from "@/components/common/offline-banner";
import { AuthProvider } from "@/context/auth-context";
import { SessionProvider } from "@/context/session-context";
import { setupNotificationListeners } from "@/services/notification-service";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return () => {
      cleanup();
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <SessionProvider>
            <AnimatedSplashOverlay />
            <OfflineBanner />
            <NotificationPermissionBanner />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(aslab)" />
              <Stack.Screen name="(main)" />
            </Stack>
          </SessionProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
