import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, borderRadius, typography } from '../../theme/theme';

/**
 * Premium Unified Sign Out Button
 * Used across ALL roles for consistent destructive action UI.
 * - Glassy red tint background
 * - Bold icon box on the right (RTL-ready)
 * - Subtle border for depth
 */
export default function SignOutButton({ onPress, label = 'تسجيل الخروج', style }) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.btn,
        {
          backgroundColor: theme.isDark
            ? 'rgba(239, 68, 68, 0.09)'
            : 'rgba(239, 68, 68, 0.06)',
          borderColor: theme.isDark
            ? 'rgba(239, 68, 68, 0.25)'
            : 'rgba(239, 68, 68, 0.18)',
        },
        style,
      ]}
    >
      {/* Icon Box — right side in RTL */}
      <View style={styles.iconBox}>
        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
      </View>

      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Subtle arrow */}
      <Ionicons name="chevron-back" size={16} color="rgba(239,68,68,0.5)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
