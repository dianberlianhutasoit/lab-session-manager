import { Link, useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth, toAuthMessage } from '@/context/auth-context';
import { LaboraColors } from '@/constants/theme';
import Svg, { Path } from 'react-native-svg';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const {
    login,
    register,
    completePractitionerProfile,
    status,
  } = useAuth();

  const [selectedRole, setSelectedRole] = useState<'praktikan' | 'asisten'>('praktikan');
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
      setError('Masukkan NIM atau email Anda.');
      return;
    }
    if (!profilePending && password.length < 6) {
      setError('Kata sandi minimal terdiri dari 6 karakter.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (profilePending) {
        await completePractitionerProfile(name);
      } else if (isRegister) {
        await register(name, email, password);
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
      'Silakan hubungi Asisten Lab atau Administrator SSO Universitas untuk mereset kata sandi akun Anda.',
      [{ text: 'Mengerti' }]
    );
  };

  const handleQuickDemo = (role: 'praktikan' | 'asisten') => {
    setSelectedRole(role);
    if (role === 'praktikan') {
      setEmail('praktikan@student.univ.ac.id');
      setPassword('password123');
    } else {
      setEmail('asisten@univ.ac.id');
      setPassword('password123');
    }
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
            <Svg width={46} height={46} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 3H15M10 3V8.5L5.5 17C4.8 18.2 5.7 19.8 7.1 19.8H16.9C18.3 19.8 19.2 18.2 18.5 17L14 8.5V3"
                stroke={LaboraColors.primary}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M12 6L16 4.5L12 3L8 4.5L12 6Z"
                fill={LaboraColors.primary}
              />
              <Path
                d="M7.5 16C9 14.8 11 16.5 12.5 15.5C14 14.5 15.5 16 16.5 15.5"
                stroke={LaboraColors.primary}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </Svg>
          </View>

          <View style={styles.suitePill}>
            <Feather name="shield" size={11} color={LaboraColors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.suitePillText}>SMART LABORATORY SUITE</Text>
          </View>

          <Text style={styles.brandTitle}>LABORA</Text>
          <Text style={styles.brandSubtitle}>
            LABORA — Sistem Manajemen Praktikum Universitas Terintegrasi
          </Text>
        </View>

        {/* Role Toggle Selector */}
        <View style={styles.roleToggleWrapper}>
          <TouchableOpacity
            style={[
              styles.roleToggleBtn,
              selectedRole === 'praktikan' && styles.roleToggleBtnActive,
            ]}
            onPress={() => setSelectedRole('praktikan')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="school-outline"
              size={16}
              color={selectedRole === 'praktikan' ? '#FFFFFF' : LaboraColors.textPrimary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.roleToggleText,
                selectedRole === 'praktikan' && styles.roleToggleTextActive,
              ]}
            >
              Praktikan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleToggleBtn,
              selectedRole === 'asisten' && styles.roleToggleBtnActive,
            ]}
            onPress={() => setSelectedRole('asisten')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="admin-panel-settings"
              size={17}
              color={selectedRole === 'asisten' ? '#FFFFFF' : LaboraColors.textPrimary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.roleToggleText,
                selectedRole === 'asisten' && styles.roleToggleTextActive,
              ]}
            >
              Asprak
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {profilePending
              ? 'Lengkapi Profil'
              : isRegister
              ? 'Daftar Akun Mahasiswa'
              : 'Masuk ke Portal'}
          </Text>
          <Text style={styles.formSubtitle}>
            {profilePending
              ? 'Lengkapi nama lengkap Anda untuk mengaktifkan akun.'
              : isRegister
              ? 'Silakan daftarkan akun mahasiswa untuk mengakses sesi lab.'
              : `Silakan lengkapi kredensial akun ${
                  selectedRole === 'asisten' ? 'asisten lab' : 'mahasiswa'
                } Anda.`}
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

          {/* Email / NIM Field */}
          {!profilePending && (
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>
                  {selectedRole === 'asisten' ? 'Email Asisten Lab' : 'NIM / Email Mahasiswa'}
                </Text>
                <Text style={styles.inputLabelBadge}>SSO Universitas</Text>
              </View>
              <View style={styles.inputBox}>
                <Feather name="mail" size={16} color={LaboraColors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={
                    selectedRole === 'asisten'
                      ? 'asisten@univ.ac.id'
                      : 'nim@student.univ.ac.id'
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
                  placeholder="Masukkan kata sandi portal"
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
                <Feather name="log-in" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>
                  {profilePending
                    ? 'Simpan Profil'
                    : isRegister
                    ? 'Daftar ke Portal LABORA'
                    : 'Masuk ke Portal LABORA'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Quick Access Testing Divider */}
          {!isRegister && !profilePending && (
            <View style={styles.demoSection}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>AKSES CEPAT PENGUJIAN</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.demoButtonsRow}>
                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => handleQuickDemo('praktikan')}
                  activeOpacity={0.7}
                >
                  <Feather name="user" size={13} color={LaboraColors.primary} style={{ marginRight: 5 }} />
                  <Text style={styles.demoBtnText}>Demo Praktikan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => handleQuickDemo('asisten')}
                  activeOpacity={0.7}
                >
                  <Feather name="shield" size={13} color={LaboraColors.primary} style={{ marginRight: 5 }} />
                  <Text style={styles.demoBtnText}>Demo Asprak</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
            <Text style={styles.securityTitle}>PROTOKOL PRESENSI DIGITAL •</Text>
            <Text style={styles.securityDesc}>
              Terkoneksi Jaringan Lab Universitas & GPS Geofencing Terverifikasi untuk validasi kehadiran real-time.
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F3D8DF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 10,
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
  roleToggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F3E8EC',
    borderRadius: 16,
    padding: 4,
    width: '100%',
    marginBottom: 16,
  },
  roleToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  roleToggleBtnActive: {
    backgroundColor: LaboraColors.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  roleToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  roleToggleTextActive: {
    color: '#FFFFFF',
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
  demoSection: {
    marginTop: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EFE5EB',
  },
  dividerText: {
    fontSize: 9,
    fontWeight: '700',
    color: LaboraColors.textMuted,
    paddingHorizontal: 10,
    letterSpacing: 0.6,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5F7',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0E2E7',
  },
  demoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: LaboraColors.primary,
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
