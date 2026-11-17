import { Redirect, Stack, type Href } from 'expo-router';
import { useAuth } from '@/context/auth-context';

export default function AuthLayout() {
  const { status } = useAuth();
  if (status === 'loading') return null;
  if (status === 'authenticated') return <Redirect href={'/' as Href} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
