import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { MemphisColors } from '@/constants/theme';

export interface PillButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'google' | 'secondary' | 'outline';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function PillButton({
  title,
  variant = 'primary',
  loading = false,
  icon,
  style,
  disabled,
  ...rest
}: PillButtonProps) {
  const isGoogle = variant === 'google';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';

  let containerStyle: StyleProp<ViewStyle> = styles.primaryContainer;
  let textStyle: StyleProp<TextStyle> = styles.primaryText;

  if (isGoogle) {
    containerStyle = styles.googleContainer;
    textStyle = styles.googleText;
  } else if (isSecondary) {
    containerStyle = styles.secondaryContainer;
    textStyle = styles.secondaryText;
  } else if (isOutline) {
    containerStyle = styles.outlineContainer;
    textStyle = styles.outlineText;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.base,
        containerStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isGoogle || isOutline ? MemphisColors.navy : '#FFFFFF'}
        />
      ) : (
        <View style={styles.contentRow}>
          {isGoogle ? (
            <Image
              source="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              style={styles.googleIcon}
              contentFit="contain"
            />
          ) : icon ? (
            <View style={styles.iconMargin}>{icon}</View>
          ) : null}
          <Text style={[styles.baseText, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  primaryContainer: {
    backgroundColor: MemphisColors.primary,
    // Soft warm shadow as in design.md
    shadowColor: MemphisColors.primaryPressed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  googleContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  googleText: {
    color: '#1E293B',
    fontWeight: '600',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  secondaryContainer: {
    backgroundColor: MemphisColors.surface,
    borderWidth: 1,
    borderColor: MemphisColors.cardBorder,
  },
  secondaryText: {
    color: MemphisColors.navy,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: MemphisColors.teal,
  },
  outlineText: {
    color: MemphisColors.teal,
  },
  iconMargin: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.6,
  },
});
