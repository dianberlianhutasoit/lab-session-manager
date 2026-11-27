/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * LABORA Smart Laboratory Suite — Google Stitch Design System.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * LABORA Smart Laboratory Suite (Google Stitch Design Tokens)
 * Theme: Deep Wine / Maroon & Soft Rose Blush
 */
export const LaboraColors = {
  // Brand Primary (Deep Wine / Maroon)
  primary: '#661633',
  primaryPressed: '#4E1026',
  primaryText: '#FFFFFF',
  primaryLight: '#8A2246',
  primarySoft: '#FDF2F4',
  blush: '#FDF2F4',
  primaryBorder: '#F3D8DF',

  // Surface & Background
  background: '#FAF7F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F0F2',
  surfaceAlt: '#F5F0F2',
  card: '#FFFFFF',
  cardBorder: '#F0E6EA',

  // Typography & Content
  text: '#1F151A',
  textPrimary: '#1F151A',
  textSecondary: '#7A6B74',
  textMuted: '#A3969E',
  inputBorder: '#E5D8DF',

  // Semantic Status
  success: '#10B981',
  successDark: '#059669',
  successSoft: '#ECFDF5',
  successBorder: '#A7F3D0',

  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  warningBorder: '#FDE68A',

  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  dangerBorder: '#FECACA',

  info: '#3B82F6',
  infoSoft: '#EFF6FF',
  infoBorder: '#BFDBFE',

  // Role Badges
  roleAsprakBg: '#FCE7EC',
  roleAsprakText: '#661633',
  rolePraktikanBg: '#F3E8FF',
  rolePraktikanText: '#6B21A8',
} as const;

/**
 * Backward compatibility alias for MemphisColors during migration
 */
export const MemphisColors = {
  primary: LaboraColors.primary,
  primaryPressed: LaboraColors.primaryPressed,
  primaryText: LaboraColors.primaryText,
  teal: LaboraColors.primary,
  tealLight: LaboraColors.primaryLight,
  mint: '#FCE7EC',
  mintLight: LaboraColors.primarySoft,
  mintSurface: LaboraColors.primarySoft,
  blueActiveCircle: '#FCE7EC',
  navy: LaboraColors.primary,
  navyCard: '#521028',
  slate: LaboraColors.textPrimary,
  muted: LaboraColors.textSecondary,
  underline: LaboraColors.inputBorder,
  underlineActive: LaboraColors.primary,
  error: LaboraColors.danger,
  background: LaboraColors.background,
  card: LaboraColors.card,
  surface: LaboraColors.surfaceMuted,
  cardBorder: LaboraColors.cardBorder,
  roleAdminText: LaboraColors.roleAsprakText,
  roleAdminBg: LaboraColors.roleAsprakBg,
  roleStudentText: LaboraColors.rolePraktikanText,
  roleStudentBg: LaboraColors.rolePraktikanBg,
} as const;

export const Colors = {
  light: {
    text: LaboraColors.textPrimary,
    background: LaboraColors.background,
    backgroundElement: LaboraColors.surfaceMuted,
    backgroundSelected: LaboraColors.primarySoft,
    textSecondary: LaboraColors.textSecondary,
    tint: LaboraColors.primary,
    primary: LaboraColors.primary,
    border: LaboraColors.cardBorder,
  },
  dark: {
    text: '#FAF7F8',
    background: '#1F151A',
    backgroundElement: '#2B1C24',
    backgroundSelected: '#421626',
    textSecondary: '#A3969E',
    tint: LaboraColors.primaryLight,
    primary: LaboraColors.primary,
    border: '#3D2532',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
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
  half: 4,
  one: 8,
  oneAndHalf: 12,
  two: 16,
  twoAndHalf: 20,
  three: 24,
  four: 32,
  five: 40,
  six: 48,
  seven: 56,
  eight: 64,
} as const;

export const Radii = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 20,
  pill: 9999,
} as const;

export const BottomTabInset = 64;
export const MaxContentWidth = 600;
