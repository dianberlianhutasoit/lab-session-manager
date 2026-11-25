import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { MemphisColors } from '@/constants/theme';

export interface StudentCardProps {
  name: string;
  nim?: string;
  email?: string;
  role?: 'aslab' | 'asprak' | 'praktikan' | 'admin';
  subInfo?: string;
  onPress?: () => void;
  rightAction?: React.ReactNode;
}

export function StudentCard({
  name,
  nim,
  email,
  role = 'praktikan',
  subInfo,
  onPress,
  rightAction,
}: StudentCardProps) {
  const initial = name.trim().charAt(0).toUpperCase() || 'U';
  const isAdmin = role === 'aslab' || role === 'asprak' || role === 'admin';

  const avatarBg = isAdmin ? MemphisColors.roleAdminBg : MemphisColors.roleStudentBg;
  const avatarTextColor = isAdmin ? MemphisColors.roleAdminText : MemphisColors.roleStudentText;

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      style={styles.card}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.row}>
        {/* Avatar Circle */}
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={[styles.avatarText, { color: avatarTextColor }]}>
            {initial}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {/* Role Badge */}
            <View
              style={[
                styles.badge,
                { backgroundColor: isAdmin ? MemphisColors.roleAdminBg : MemphisColors.roleStudentBg },
              ]}
            >
              {isAdmin ? (
                <Ionicons name="shield-checkmark" size={12} color={MemphisColors.roleAdminText} />
              ) : (
                <Feather name="book-open" size={11} color={MemphisColors.roleStudentText} />
              )}
              <Text
                style={[
                  styles.badgeText,
                  { color: isAdmin ? MemphisColors.roleAdminText : MemphisColors.roleStudentText },
                ]}
              >
                {isAdmin ? 'Asisten Lab' : 'Praktikan'}
              </Text>
            </View>
          </View>

          {nim ? <Text style={styles.nim}>NIM: {nim}</Text> : null}
          {email ? <Text style={styles.email}>{email}</Text> : null}
          {subInfo ? <Text style={styles.subInfo}>{subInfo}</Text> : null}
        </View>

        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
    </CardWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: MemphisColors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MemphisColors.cardBorder,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: MemphisColors.navy,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  nim: {
    fontSize: 13,
    color: MemphisColors.slate,
    fontWeight: '500',
  },
  email: {
    fontSize: 12,
    color: MemphisColors.muted,
    marginTop: 2,
  },
  subInfo: {
    fontSize: 12,
    color: MemphisColors.teal,
    fontWeight: '500',
    marginTop: 2,
  },
  rightAction: {
    marginLeft: 8,
  },
});
