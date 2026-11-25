import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { isStaffRole } from '@/features/asprak/role-utils';

export default function AppTabs() {
  const scheme = useColorScheme();
  const { profile } = useAuth();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const isStaff = isStaffRole(profile?.role);

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      {isStaff && <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Sesi Lab</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>}

      {profile?.role === 'praktikan' && <NativeTabs.Trigger name="praktikan">
        <NativeTabs.Trigger.Label>Praktikan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>}

      {isStaff && <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Rekap Presensi</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>}

      <NativeTabs.Trigger name="maps">
        <NativeTabs.Trigger.Label>Peta Lab</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
