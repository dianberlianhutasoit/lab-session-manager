/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Modern Deep Navy & Ice Blue Design Tokens
 * As specified in design.md (based on reference mobile mockup)
 */
export const MemphisColors = {
  // Primary CTA & Hero Contrast (Deep Midnight Navy)
  primary: '#0B192C',
  primaryPressed: '#07111E',
  primaryText: '#FFFFFF',
  
  // Secondary / Graphic Accent (Cobalt & Ice Blue)
  teal: '#2563EB',
  tealLight: '#3B82F6',
  mint: '#93C5FD',
  mintLight: '#DBEAFE',
  mintSurface: '#F0F6FF',
  blueActiveCircle: '#DCEBFE',
  
  // Base Contrast (Deep Navy & Slate)
  navy: '#0B192C',
  navyCard: '#0E2238',
  slate: '#334155',
  muted: '#64748B',
  underline: '#CBD5E1',
  underlineActive: '#2563EB',
  error: '#EF4444',
  
  // Backgrounds & Surfaces
  background: '#FFFFFF',
  card: '#FFFFFF',
  surface: '#F8FAFC',
  cardBorder: '#EDF2F7',
  
  // Role Indicators
  roleAdminText: '#0B192C',
  roleAdminBg: '#EBF3FC',
  roleStudentText: '#2563EB',
  roleStudentBg: '#DBEAFE',
} as const;

export const Colors = {
  light: {
    text: '#0B192C',
    background: '#FFFFFF',
    backgroundElement: '#F0F6FF',
    backgroundSelected: '#DCEBFE',
    textSecondary: '#64748B',
    tint: '#2563EB',
    primary: '#0B192C',
    border: '#EDF2F7',
  },
  dark: {
    text: '#F8FAFC',
    background: '#0B192C',
    backgroundElement: '#112240',
    backgroundSelected: '#1E2E48',
    textSecondary: '#94A3B8',
    tint: '#3B82F6',
    primary: '#2563EB',
    border: '#1E2E48',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
