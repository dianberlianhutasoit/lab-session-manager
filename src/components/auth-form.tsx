import { Link, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth, toAuthMessage } from '@/context/auth-context';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const { login, register, completePractitionerProfile, logout, status, error: profileError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isRegister = mode === 'register';

  const submit = async () => {
    if (isRegister && name.trim().length < 2) { setError('Masukkan nama lengkap Anda.'); return; }
    if (!profilePending && !email.trim()) { setError('Masukkan email Anda.'); return; }
    if (!profilePending && password.length < 6) { setError('Password minimal terdiri dari 6 karakter.'); return; }
    setError(''); setBusy(true);
    try {
      if (profilePending) await completePractitionerProfile(name);
      else if (isRegister) await register(name, email, password);
      else await login(email, password);
      router.replace('/' as Href);
    } catch (cause) { setError(toAuthMessage(cause)); }
    finally { setBusy(false); }
  };

  const profilePending = status === 'needsProfile' || status === 'profileError';
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <View style={styles.mark}><Text style={styles.markText}>LS</Text></View>
        <Text style={styles.eyebrow}>LAB SESSION MANAGER</Text>
        <Text style={styles.title}>{isRegister ? 'Buat akun' : 'Selamat datang'}</Text>
        <Text style={styles.subtitle}>{isRegister ? 'Daftar untuk melihat jadwal dan presensi praktikum.' : 'Masuk untuk melanjutkan ke sesi praktikum Anda.'}</Text>

        {profilePending && <Text style={styles.error}>{profileError ?? 'Profil akun belum tersedia. Hubungi administrator.'}</Text>}
        {(isRegister || profilePending) && <Field label="Nama lengkap" value={name} onChangeText={setName} placeholder="Nama Anda" autoCapitalize="words" />}
        {!profilePending && <Field label="Email" value={email} onChangeText={setEmail} placeholder="nama@email.com" keyboardType="email-address" autoCapitalize="none" />}
        {!profilePending && <Field label="Password" value={password} onChangeText={setPassword} placeholder="Minimal 6 karakter" secureTextEntry />}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={[styles.submit, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{profilePending ? 'Simpan profil' : isRegister ? 'Daftar' : 'Masuk'}</Text>}
        </TouchableOpacity>
        {profilePending ? <TouchableOpacity onPress={() => void logout()} style={styles.secondary}><Text style={styles.secondaryText}>Keluar dari akun</Text></TouchableOpacity> : <View style={styles.footer}>
          <Text style={styles.footerText}>{isRegister ? 'Sudah memiliki akun?' : 'Belum memiliki akun?'}</Text>
          <Link href={(isRegister ? '/login' : '/register') as Href} style={styles.link}>{isRegister ? 'Masuk' : 'Daftar'}</Link>
        </View>}
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput {...inputProps} style={styles.input} placeholderTextColor="#7B8193" autoCorrect={false} returnKeyType="next" />
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#12121A' }, scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 }, container: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 16 },
  mark: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#263B5A', alignItems: 'center', justifyContent: 'center' }, markText: { color: '#8AB4FF', fontSize: 16, fontWeight: '800' }, eyebrow: { color: '#8AB4FF', fontSize: 11, letterSpacing: 1.1, fontWeight: '700', marginBottom: -10 }, title: { color: '#F8F8F2', fontSize: 30, lineHeight: 36, fontWeight: '700' }, subtitle: { color: '#A5ADC4', fontSize: 15, lineHeight: 22, marginBottom: 6 },
  field: { gap: 7 }, label: { color: '#E6E8EF', fontSize: 13, fontWeight: '600' }, input: { height: 50, color: '#F8F8F2', backgroundColor: '#1E1E2A', borderWidth: 1, borderColor: '#343748', borderRadius: 10, paddingHorizontal: 14, fontSize: 15 }, submit: { height: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F8EF7', borderRadius: 10, marginTop: 4 }, submitText: { color: '#fff', fontSize: 15, fontWeight: '700' }, disabled: { opacity: 0.55 }, error: { color: '#FF9B9B', fontSize: 13, lineHeight: 19 }, footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 }, footerText: { color: '#A5ADC4', fontSize: 14 }, link: { color: '#8AB4FF', fontSize: 14, fontWeight: '700' },
  secondary: { alignItems: 'center', paddingVertical: 8 }, secondaryText: { color: '#A5ADC4', fontSize: 14, fontWeight: '600' },
});
