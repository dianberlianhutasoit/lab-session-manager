import { Feather } from '@expo/vector-icons';
import { Redirect, Tabs, type Href } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LaboraColors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { AslabProvider } from '@/features/aslab/aslab-context';

export default function AslabLayout() {
  const { status, profile, error, logout } = useAuth();
  const insets = useSafeAreaInsets();

  if (status === 'loading') {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={LaboraColors.primary} size="large" />
      </View>
    );
  }

  if (status === 'signedOut') {
    return <Redirect href={'/login' as Href} />;
  }

  if (status === 'needsProfile' || status === 'profileError' || !profile) {
    return (
      <View style={styles.state}>
        <Text style={styles.title}>Profil Aslab tidak tersedia</Text>
        <Text style={styles.message}>
          {error ?? 'Akun Anda belum memiliki profil aktif.'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => void logout()}>
          <Text style={styles.buttonText}>Keluar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (profile.role !== 'aslab') {
    return <Redirect href={'/' as Href} />;
  }

  return (
    <AslabProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: LaboraColors.primary,
          tabBarInactiveTintColor: LaboraColors.textSecondary,
          tabBarStyle: {
            backgroundColor: LaboraColors.surface,
            borderTopColor: LaboraColors.cardBorder,
            height: 60 + Math.max(insets.bottom, 6),
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom, 8),
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Feather
                name="bar-chart-2"
                size={size - 2}
                color={typeof color === 'string' ? color : LaboraColors.primary}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="labs"
          options={{
            title: 'Lab & MK',
            tabBarIcon: ({ color, size }) => (
              <Feather
                name="layers"
                size={size - 2}
                color={typeof color === 'string' ? color : LaboraColors.primary}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="members"
          options={{
            title: 'Anggota',
            tabBarIcon: ({ color, size }) => (
              <Feather
                name="users"
                size={size - 2}
                color={typeof color === 'string' ? color : LaboraColors.primary}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="bulk"
          options={{
            title: 'Bulk Insert',
            tabBarIcon: ({ color, size }) => (
              <Feather
                name="upload-cloud"
                size={size - 2}
                color={typeof color === 'string' ? color : LaboraColors.primary}
              />
            ),
          }}
        />
      </Tabs>
    </AslabProvider>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    backgroundColor: LaboraColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  title: {
    color: LaboraColors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: LaboraColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 10,
    backgroundColor: LaboraColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
