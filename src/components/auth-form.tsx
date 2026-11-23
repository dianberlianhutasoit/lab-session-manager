import { Link, useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth, toAuthMessage } from '@/context/auth-context';
import { MemphisHeader } from '@/components/MemphisHeader';
import { UnderlineInput } from '@/components/UnderlineInput';
import { PillButton } from '@/components/PillButton';
import { MemphisColors } from '@/constants/theme';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const {
    login,
    register,
    completePractitionerProfile,
    logout,
    status,
    error: profileError,
  } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isRegister = mode === 'register';
  const profilePending = status === 'needsProfile' || status === 'profileError';

  const submit = async () => {
    if (isRegister && name.trim().length < 2) {
      setError('Masukkan nama lengkap Anda.');
      return;
    }
    if (!profilePending && !email.trim()) {
      setError('Masukkan email Anda.');
      return;
    }
    if (!profilePending && password.length < 6) {
      setError('Password minimal terdiri dari 6 karakter.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (profilePending) await completePractitionerProfile(name);
      else if (isRegister) await register(name, email, password);
      else await login(email, password);
      router.replace('/' as Href);
    } catch (cause) {
      setError(toAuthMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Lupa Password',
      'Silakan hubungi Asisten Lab atau Admin untuk mereset kata sandi akun Anda.',
      [{ text: 'Mengerti' }]
    );
  };

  const handleGoogleSignIn = () => {
    Alert.alert(
      'Google Sign-In',
      'Fitur Masuk dengan Google saat ini sedang dalam proses konfigurasi OAuth.',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Memphis Header Graphic Ornament */}
        <MemphisHeader height={190} />

        <View style={styles.formContainer}>
          {/* Title & Eyebrow */}
          <Text style={styles.eyebrow}>LAB SESSION MANAGER</Text>
          <Text style={styles.title}>
            {profilePending
              ? 'LENGKAPI PROFIL'
              : isRegister
              ? 'CREATE ACCOUNT'
              : 'LOGIN'}
          </Text>
          <Text style={styles.subtitle}>
            {profilePending
              ? 'Lengkapi nama lengkap Anda untuk mengaktifkan akun.'
              : isRegister
              ? 'Daftar untuk melihat jadwal dan presensi praktikum.'
              : 'Masuk untuk melanjutkan ke sesi praktikum Anda.'}
          </Text>

          {profilePending && (
            <Text style={styles.profileError}>
              {profileError ?? 'Profil akun belum tersedia. Hubungi administrator.'}
            </Text>
          )}

          {/* Form Fields */}
          {(isRegister || profilePending) && (
            <UnderlineInput
              label="Nama Lengkap"
              placeholder="Masukkan nama lengkap"
              value={name}
              onChangeText={setName}
              iconName="user"
              autoCapitalize="words"
            />
          )}

          {!profilePending && (
            <UnderlineInput
              label="Email"
              placeholder="nama@email.com"
              value={email}
              onChangeText={setEmail}
              iconName="mail"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}

          {!profilePending && (
            <UnderlineInput
              label="Password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChangeText={setPassword}
              iconName="lock"
              secureTextEntry={!showPassword}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color={MemphisColors.muted}
                  />
                </TouchableOpacity>
              }
            />
          )}

          {/* Forgot Password Link */}
          {!isRegister && !profilePending && (
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot your Password?</Text>
            </TouchableOpacity>
          )}

          {/* General Error Message */}
          {!!error && (
            <Text accessibilityRole="alert" style={styles.errorAlert}>
              {error}
            </Text>
          )}

          {/* Primary Action Button (Warm Golden Yellow Pill) */}
          <View style={styles.actionGroup}>
            <PillButton
              title={
                profilePending
                  ? 'SIMPAN PROFIL'
                  : isRegister
                  ? 'REGISTER NOW'
                  : 'LOGIN'
              }
              variant="primary"
              loading={busy}
              onPress={() => void submit()}
            />

            {/* Google Sign-In Button */}
            {!profilePending && (
              <PillButton
                title="Masuk dengan Google"
                variant="google"
                onPress={handleGoogleSignIn}
                style={styles.googleButton}
              />
            )}
          </View>

          {/* Footer Navigation */}
          {profilePending ? (
            <TouchableOpacity
              onPress={() => void logout()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>Keluar dari akun</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {isRegister
                  ? 'Already have an account? '
                  : "Don't have an account? "}
              </Text>
              <Link
                href={(isRegister ? '/login' : '/register') as Href}
                asChild
              >
                <TouchableOpacity>
                  <Text style={styles.linkText}>
                    {isRegister ? 'Login' : 'Register Now'}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  eyebrow: {
    color: MemphisColors.teal,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    color: MemphisColors.navy,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  subtitle: {
    color: MemphisColors.slate,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  profileError: {
    color: MemphisColors.error,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: MemphisColors.teal,
    fontSize: 13,
    fontWeight: '600',
  },
  errorAlert: {
    color: MemphisColors.error,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
    textAlign: 'center',
  },
  actionGroup: {
    gap: 12,
    marginTop: 4,
  },
  googleButton: {
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    color: MemphisColors.slate,
    fontSize: 14,
  },
  linkText: {
    color: MemphisColors.teal,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 12,
  },
  secondaryText: {
    color: MemphisColors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
});
