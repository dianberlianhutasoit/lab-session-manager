import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MemphisColors } from '@/constants/theme';

export interface UnderlineInputProps extends TextInputProps {
  label?: string;
  iconName?: keyof typeof Feather.glyphMap | keyof typeof Ionicons.glyphMap;
  iconType?: 'feather' | 'ionicons';
  error?: string;
  rightElement?: React.ReactNode;
}

export function UnderlineInput({
  label,
  iconName,
  iconType = 'feather',
  error,
  rightElement,
  onFocus,
  onBlur,
  style,
  ...rest
}: UnderlineInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const borderColor = error
    ? MemphisColors.error
    : isFocused
    ? MemphisColors.underlineActive
    : MemphisColors.underline;

  const borderWidth = isFocused ? 2 : 1.5;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          {
            borderBottomColor: borderColor,
            borderBottomWidth: borderWidth,
          },
        ]}
      >
        {iconName ? (
          <View style={styles.iconContainer}>
            {iconType === 'ionicons' ? (
              <Ionicons
                name={iconName as any}
                size={20}
                color={MemphisColors.tealLight}
              />
            ) : (
              <Feather
                name={iconName as any}
                size={18}
                color={MemphisColors.tealLight}
              />
            )}
          </View>
        ) : null}

        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={MemphisColors.muted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={MemphisColors.teal}
          {...rest}
        />

        {rightElement ? (
          <View style={styles.rightElement}>{rightElement}</View>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: MemphisColors.slate,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: MemphisColors.navy,
    padding: 0,
    margin: 0,
  },
  rightElement: {
    marginLeft: 8,
  },
  errorText: {
    marginTop: 5,
    fontSize: 12,
    color: MemphisColors.error,
    fontWeight: '500',
  },
});
