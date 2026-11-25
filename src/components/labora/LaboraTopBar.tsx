import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LaboraColors } from '@/constants/theme';
import { router } from 'expo-router';

interface LaboraTopBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  roleBadgeText?: string;
  roleBadge?: string;
  onRolePress?: () => void;
  onRoleBadgePress?: () => void;
  userName?: string;
  isOnline?: boolean;
  onProfilePress?: () => void;
}

export function LaboraLogoIcon({ size = 32 }: { size?: number }) {
  return (
    <View style={[styles.logoCircle, { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }]}>
      <Image
        source={require('@/../assets/images/labora-logo.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export function LaboraTopBar({
  title = 'Beranda',
  subtitle,
  showBack = false,
  onBack,
  roleBadgeText,
  roleBadge,
  onRolePress,
  onRoleBadgePress,
  userName,
  isOnline,
  onProfilePress,
}: LaboraTopBarProps) {
  const effectiveRoleText = roleBadge || roleBadgeText;
  const effectiveRolePress = onRoleBadgePress || onRolePress;
  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack || (() => router.back())}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={LaboraColors.primary} />
          </TouchableOpacity>
        ) : (
          <LaboraLogoIcon size={34} />
        )}

        <View style={styles.titleColumn}>
          {!showBack && (
            <Text style={styles.brandTag}>LABORA</Text>
          )}
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightRow}>
        {effectiveRoleText && (
          <TouchableOpacity
            style={styles.rolePill}
            onPress={effectiveRolePress}
            activeOpacity={0.8}
            disabled={!effectiveRolePress}
          >
            <Feather name="repeat" size={13} color={LaboraColors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.rolePillText}>{effectiveRoleText}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.profileButton}
          onPress={onProfilePress || (() => router.push('/(main)/explore' as any))}
          activeOpacity={0.7}
        >
          <Feather name="user" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: LaboraColors.background,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoCircle: {
    backgroundColor: '#FCE7EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#F3D8DF',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  titleColumn: {
    flex: 1,
  },
  brandTag: {
    fontSize: 10,
    fontWeight: '700',
    color: LaboraColors.primaryLight,
    letterSpacing: 1.2,
    marginBottom: -2,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '400',
    color: LaboraColors.textSecondary,
    marginTop: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LaboraColors.roleAsprakBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LaboraColors.primaryBorder,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: LaboraColors.roleAsprakText,
  },
  profileButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: LaboraColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
