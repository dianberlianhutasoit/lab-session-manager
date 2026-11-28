import { Link, useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth, toAuthMessage } from '@/context/auth-context';
import { LaboraColors } from '@/constants/theme';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const {
    login,
    register,
    completePractitionerProfile,
    status,
  } = useAuth();

  const [name, setName] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isRegister = mode === 'register';
  const profilePending = status === 'needsProfile' || status === 'profileError';

  const submit = async () => {
    if (isRegister && name.trim().length < 2) {
      setError('Masukkan nama lengkap Anda.');
      return;
    }
    if (isRegister && nim.trim().length < 4) {
      setError('Masukkan Nomor Induk Mahasiswa (NIM) yang valid.');
      return;
    }
    if (!profilePending && !email.trim()) {
      setError('Masukkan email akun SSO Universitas Anda.');
      return;
    }
    if (!profilePending && password.length < 6) {
      setError('Kata sandi minimal terdiri dari 6 karakter.');
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (profilePending) {
        await completePractitionerProfile(name, nim);
      } else if (isRegister) {
        await register(name, email, password, nim);
      } else {
        await login(email, password);
      }
      router.replace('/' as Href);
    } catch (cause) {
      setError(toAuthMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Lupa Kata Sandi',
      'Silakan hubungi Administrator Lab atau Helpdesk SSO Universitas untuk mereset kata sandi akun Anda.',
      [{ text: 'Mengerti' }]
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
        {/* Top Logo and Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoBadge}>
            <Image
              source={require('@/assets/images/logo_labora.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.suitePill}>
            <Feather name="shield" size={11} color={LaboraColors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.suitePillText}>SMART LABORATORY SUITE</Text>
          </View>

          <Text style={styles.brandTitle}>LABORA</Text>
          <Text style={styles.brandSubtitle}>
            Sistem Manajemen Laboratorium
          </Text>
        </View>

        {/* Main Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {profilePending
              ? 'Lengkapi Profil'
              : isRegister
              ? 'Registrasi Akun Praktikan'
              : 'Masuk Portal LABORA'}
          </Text>
          <Text style={styles.formSubtitle}>
            {profilePending
              ? 'Lengkapi data identitas Anda untuk mengaktifkan akun.'
              : isRegister
              ? 'Daftarkan data mahasiswa Anda untuk akses presensi dan jadwal lab.'
              : 'Gunakan akun SSO resmi Universitas Anda untuk masuk ke sistem.'}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={LaboraColors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Name Field (for Register or Profile Complete) */}
          {(isRegister || profilePending) && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Lengkap Mahasiswa</Text>
              <View style={styles.inputBox}>
                <Feather name="user" size={16} color={LaboraColors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor={LaboraColors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* NIM Field (for Register or Profile Complete) */}
          {(isRegister || profilePending) && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor Induk Mahasiswa (NIM)</Text>
              <View style={styles.inputBox}>
                <Ionicons name="card-outline" size={16} color={LaboraColors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="cth: 2110511001"
                  placeholderTextColor={LaboraColors.textMuted}
                  value={nim}
                  onChangeText={setNim}
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}

          {/* Email Field */}
          {!profilePending && (
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>
                  {isRegister ? 'Email Mahasiswa' : 'Email Akun SSO Universitas'}
                </Text>
                <Text style={styles.inputLabelBadge}>SSO Terverifikasi</Text>
              </View>
              <View style={styles.inputBox}>
                <Feather name="mail" size={16} color={LaboraColors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={
                    isRegister
                      ? 'nim@student.univ.ac.id'
                      : 'nama@univ.ac.id atau nim@student.univ.ac.id'
                  }
                  placeholderTextColor={LaboraColors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>
          )}

          {/* Password Field */}
          {!profilePending && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kata Sandi</Text>
              <View style={styles.inputBox}>
                <Feather name="lock" size={16} color={LaboraColors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Masukkan kata sandi akun"
                  placeholderTextColor={LaboraColors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={16}
                    color={LaboraColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Confirm Password Field (Only for Register) */}
          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Konfirmasi Kata Sandi</Text>
              <View style={styles.inputBox}>
                <Feather name="check-circle" size={16} color={LaboraColors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Ulangi kata sandi"
                  placeholderTextColor={LaboraColors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={16}
                    color={LaboraColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Forgot Password Link */}
          {!isRegister && !profilePending && (
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Lupa Kata Sandi?</Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, busy && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.8}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.submitBtnContent}>
                <Feather name={isRegister ? 'user-plus' : 'log-in'} size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>
                  {profilePending
                    ? 'Simpan Profil'
                    : isRegister
                    ? 'Daftar Akun Praktikan'
                    : 'Masuk ke Portal LABORA'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Switch Mode Footer */}
        <View style={styles.footerRow}>
          {isRegister ? (
            <Text style={styles.footerPrompt}>
              Sudah memiliki akun?{' '}
              <Link href={'/login' as Href} style={styles.footerLink}>
                Masuk Sekarang ➔
              </Link>
            </Text>
          ) : (
            <Text style={styles.footerPrompt}>
              Belum memiliki akun praktikan?{' '}
              <Link href={'/register' as Href} style={styles.footerLink}>
                Daftar Sekarang ➔
              </Link>
            </Text>
          )}
        </View>

        {/* Security / Protocol Info Box */}
        <View style={styles.securityBox}>
          <View style={styles.securityIconCircle}>
            <Feather name="shield" size={14} color={LaboraColors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.securityTitle}>SISTEM PRESENSI RESMI UNIVERSITAS</Text>
            <Text style={styles.securityDesc}>
              Tervalidasi GPS Geofencing laboratorium & tersinkronisasi real-time dengan database presensi akademik.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: LaboraColors.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F3D8DF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  suitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE7EC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3D8DF',
    marginBottom: 6,
  },
  suitePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: LaboraColors.primary,
    letterSpacing: 0.8,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
    lineHeight: 17,
  },
  formCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  formSubtitle: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    marginTop: 3,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: LaboraColors.danger,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
    marginBottom: 6,
  },
  inputLabelBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: LaboraColors.primaryLight,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF8F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE5EB',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: LaboraColors.textPrimary,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  submitButton: {
    backgroundColor: LaboraColors.primary,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LaboraColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerRow: {
    marginTop: 16,
    marginBottom: 16,
  },
  footerPrompt: {
    fontSize: 13,
    color: LaboraColors.textSecondary,
  },
  footerLink: {
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE7EC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3D8DF',
    width: '100%',
  },
  securityIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: LaboraColors.primary,
    letterSpacing: 0.5,
  },
  securityDesc: {
    fontSize: 10,
    color: LaboraColors.textSecondary,
    lineHeight: 14,
    marginTop: 1,
  },
});
