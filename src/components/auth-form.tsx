import { Link, useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth, toAuthMessage } from '@/context/auth-context';
import { LaboraColors } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaler based on Figma iPhone width (402px)
const SCALE = Math.min(Math.max(SCREEN_WIDTH / 402, 0.85), 1.25);
const s = (val: number) => Math.round(val * SCALE);

// Colors exactly as specified in Figma
const COLOR_BG = '#F8F5F2';
const COLOR_MAROON = '#64102A';
const COLOR_BUTTON = '#791636';
const COLOR_INPUT_BORDER = '#918C92';
const COLOR_PLACEHOLDER = '#8E7F7F';

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
      setError('Masukkan nama pengguna atau email Anda.');
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
    <View style={styles.screen}>
      {/* 1. Lingkaran Abstrak Ujung Kanan (Top-Right Asset) */}
      <Image
        source={require('@/assets/images/lingkaran_ujung_kanan.png')}
        style={styles.lingkaranUjungKanan}
        resizeMode="contain"
        pointerEvents="none"
      />

      {/* 2. Lingkaran Abstrak Kiri Tengah (Mid-Left Asset behind mascot) */}
      <Image
        source={require('@/assets/images/lingkaran_kiri_tengah.png')}
        style={styles.lingkaranKiriTengah}
        resizeMode="contain"
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ================= HEADER: Maskot & Logo ================= */}
          <View style={styles.headerArea}>
            {/* Mascot Singa (maskot_labora_login.png) */}
            <View style={styles.mascotContainer} pointerEvents="none">
              <Image
                source={require('@/assets/images/maskot_labora_login.png')}
                style={styles.mascotImage}
                resizeMode="contain"
              />
            </View>

            {/* Logo Labora & Typography (logo_labora.png) */}
            <View style={styles.logoGroup}>
              <Image
                source={require('@/assets/images/logo_labora.png')}
                style={styles.logoIcon}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* ================= LOGIN SECTION: White Rounded Card ================= */}
          <View style={styles.loginCard}>
            {/* Title: Hai, Laborans! */}
            <Text style={styles.greetingTitle}>Hai, Laborans!</Text>

            {/* Subtitle */}
            <Text style={styles.greetingSubtitle}>
              {profilePending
                ? 'Lengkapi data identitas Anda untuk mengaktifkan akun.'
                : isRegister
                ? 'Silakan buat akun baru untuk mengakses laboratorium Anda'
                : 'Silakan masuk atau buat akun baru untuk mengakses laboratorium Anda'}
            </Text>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={LaboraColors.danger} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Field: Nama Lengkap (Register / Profile Pending) */}
            {(isRegister || profilePending) && (
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color={COLOR_MAROON} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="Nama Lengkap"
                  placeholderTextColor={COLOR_PLACEHOLDER}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Field: NIM (Register / Profile Pending) */}
            {(isRegister || profilePending) && (
              <View style={styles.inputContainer}>
                <Ionicons name="card" size={20} color={COLOR_MAROON} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="Nomor Induk Mahasiswa (NIM)"
                  placeholderTextColor={COLOR_PLACEHOLDER}
                  value={nim}
                  onChangeText={setNim}
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Field: Username / Email */}
            {!profilePending && (
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color={COLOR_MAROON} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="Nama Pengguna / Email"
                  placeholderTextColor={COLOR_PLACEHOLDER}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            )}

            {/* Field: Password */}
            {!profilePending && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={COLOR_MAROON} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="Kata Sandi"
                  placeholderTextColor={COLOR_PLACEHOLDER}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.iconToggle}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={COLOR_MAROON}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Field: Konfirmasi Password (Register) */}
            {isRegister && (
              <View style={styles.inputContainer}>
                <Ionicons name="checkmark-circle" size={20} color={COLOR_MAROON} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="Konfirmasi Kata Sandi"
                  placeholderTextColor={COLOR_PLACEHOLDER}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  style={styles.iconToggle}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={COLOR_MAROON}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Lupa Kata Sandi? */}
            {!isRegister && !profilePending && (
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotPasswordContainer}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Lupa Kata Sandi?</Text>
              </TouchableOpacity>
            )}

            {/* Tombol MASUK (Pill Button) */}
            <TouchableOpacity
              style={[styles.loginButton, busy && { opacity: 0.75 }]}
              onPress={submit}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>
                  {profilePending ? 'SIMPAN' : isRegister ? 'DAFTAR' : 'MASUK'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Belum punya akun? Daftar Sekarang */}
            <View style={styles.switchAuthRow}>
              {isRegister ? (
                <Text style={styles.switchAuthPrompt}>
                  Sudah punya akun?{' '}
                  <Link href={'/login' as Href} style={styles.switchAuthHighlight}>
                    Masuk Sekarang
                  </Link>
                </Text>
              ) : (
                <Text style={styles.switchAuthPrompt}>
                  Belum punya akun?{' '}
                  <Link href={'/register' as Href} style={styles.switchAuthHighlight}>
                    Daftar Sekarang
                  </Link>
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 3. Lingkaran Abstrak Ujung Kiri (Bottom-Left Asset) */}
      <Image
        source={require('@/assets/images/lingkaran_ujung_kiri.png')}
        style={styles.lingkaranUjungKiri}
        resizeMode="contain"
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLOR_BG,
    overflow: 'hidden',
    position: 'relative',
  },
  flexOne: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  /* ================= FIGMA ABSTRACT IMAGE ASSETS ================= */
  lingkaranUjungKanan: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: s(215),
    height: s(243),
    zIndex: 1,
  },
  lingkaranKiriTengah: {
    position: 'absolute',
    left: 0,
    top: s(150),
    width: s(190),
    height: s(220),
    zIndex: 1,
  },
  lingkaranUjungKiri: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: s(171),
    height: s(152),
    zIndex: 10,
  },

  /* ================= HEADER: MASCOT & LOGO ================= */
  headerArea: {
    height: s(345),
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
    zIndex: 3,
  },
  mascotContainer: {
    position: 'absolute',
    left: s(-15),
    bottom: 0,
    width: s(235),
    height: s(210),
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  mascotImage: {
    width: '120%',
    height: '140%',
  },
  logoGroup: {
    position: 'absolute',
    right: s(22),
    bottom: s(32),
    alignItems: 'center',
    width: s(145),
  },
  logoIcon: {
    width: s(175),
    height: s(130),
    marginBottom: s(-15),
  },
  subLaboraText: {
    fontSize: s(9.5),
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
    lineHeight: s(13),
    marginTop: s(1),
  },

  /* ================= LOGIN SECTION: WHITE CARD ================= */
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: s(-3),
    paddingHorizontal: s(22),
    paddingTop: s(20),
    paddingBottom: Platform.OS === 'ios' ? s(38) : s(28),
    minHeight: SCREEN_HEIGHT * 0.90,
    zIndex: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  greetingTitle: {
    fontSize: s(34),
    fontWeight: '700',
    lineHeight: s(42),
    color: COLOR_MAROON,
    textAlign: 'center',
    marginBottom: s(6),
  },
  greetingSubtitle: {
    fontSize: s(15.5),
    fontWeight: '500',
    lineHeight: s(21),
    color: '#000000',
    textAlign: 'center',
    paddingHorizontal: s(12),
    marginBottom: s(24),
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 5,
    padding: s(10),
    marginBottom: s(14),
  },
  errorText: {
    fontSize: s(12),
    color: LaboraColors.danger,
    flex: 1,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR_INPUT_BORDER,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    height: s(50),
    paddingHorizontal: s(14),
    marginBottom: s(14),
  },
  inputIcon: {
    marginRight: s(12),
  },
  inputField: {
    flex: 1,
    fontSize: s(15),
    fontWeight: '500',
    color: '#1E293B',
    height: '100%',
    paddingVertical: 0,
  },
  iconToggle: {
    padding: s(6),
    marginLeft: s(4),
  },

  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: s(2),
    marginBottom: s(24),
    paddingVertical: s(4),
  },
  forgotPasswordText: {
    fontSize: s(14),
    fontWeight: '500',
    lineHeight: s(18),
    color: COLOR_MAROON,
  },

  loginButton: {
    backgroundColor: COLOR_BUTTON,
    borderRadius: 30,
    height: s(50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: s(20),
    shadowColor: COLOR_BUTTON,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  loginButtonText: {
    fontSize: s(16),
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: s(20),
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  switchAuthRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(4),
  },
  switchAuthPrompt: {
    fontSize: s(15),
    fontWeight: '500',
    lineHeight: s(20),
    color: '#000000',
    textAlign: 'center',
  },
  switchAuthHighlight: {
    fontWeight: '700',
    color: COLOR_MAROON,
  },
});
