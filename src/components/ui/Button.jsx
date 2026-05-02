import React from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  Platform,
  Pressable
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { typography, borderRadius as themeRadius } from '../../theme/theme';

/**
 * Premium Solid Button component.
 * Upgraded to match the high-end Cinematic App.js design.
 * Features ultra-snappy physics, strong RTL layout, and heavy typography.
 */
export default function Button({
  title,
  onPress,
  variant = 'primary', // primary | secondary | outline | danger | ghost
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = true,
}) {
  const theme = useTheme();

  // High-performance shared value for scale
  const scale = useSharedValue(1);

  // Hardcoded premium colors from landing page to guarantee the aesthetic
  const PREMIUM_COLORS = {
    primary: '#2D6A4F',
    primaryHover: '#1B4332',
    accentMint: '#74C69D',
    danger: '#EF4444',
    bgWhite: '#FFFFFF',
    textMain: '#0F172A',
    border: 'rgba(15, 23, 42, 0.06)',
  };

  const handlePressIn = () => {
    if (disabled || loading) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // High-tension snappy scale down matching ImpactButton
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400, mass: 0.5 });
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    // Explosive bounce back
    scale.value = withSpring(1, { damping: 12, stiffness: 400, mass: 0.5 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getBackgroundColor = () => {
    if (disabled) return theme.isDark ? '#334155' : '#E2E8F0';
    switch (variant) {
      case 'primary': return PREMIUM_COLORS.primary;
      case 'secondary': return PREMIUM_COLORS.bgWhite;
      case 'outline': return 'transparent';
      case 'danger': return PREMIUM_COLORS.danger;
      case 'ghost': return 'transparent';
      case 'gradient': return PREMIUM_COLORS.primary; // Mapped to primary for consistent branding
      default: return PREMIUM_COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return '#94A3B8';
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'gradient': return PREMIUM_COLORS.bgWhite;
      case 'secondary':
      case 'outline':
      case 'ghost': return PREMIUM_COLORS.textMain;
      default: return PREMIUM_COLORS.bgWhite;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingVertical: 10, paddingHorizontal: 20, minHeight: 44 };
      case 'md': return { paddingVertical: 16, paddingHorizontal: 28, minHeight: 56 };
      case 'lg': return { paddingVertical: 20, paddingHorizontal: 36, minHeight: 64 };
      default: return { paddingVertical: 16, paddingHorizontal: 28, minHeight: 56 };
    }
  };

  const isPrimaryVariant = variant === 'primary' || variant === 'gradient';

  return (
    <Animated.View style={[animatedStyle, fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={() => {
          if (!disabled && !loading && onPress) {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            onPress();
          }
        }}
        disabled={disabled || loading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.button,
          getPadding(),
          { backgroundColor: getBackgroundColor() },
          isPrimaryVariant && !disabled && styles.btnPrimaryShadow, // <--- SHADOW MOVED HERE
          variant === 'secondary' && styles.btnSecondaryBorder,
          variant === 'outline' && {
            borderWidth: 2,
            borderColor: disabled ? PREMIUM_COLORS.border : PREMIUM_COLORS.primary,
          },
          fullWidth && styles.fullWidth,
          pressed && !disabled && !loading && styles.pressedState
        ]}
      >
        <View style={styles.contentRow}>
          {loading ? (
            <ActivityIndicator color={getTextColor()} size="small" />
          ) : (
            <>
              <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
                {title}
              </Text>
              {icon && (
                <View style={{ marginStart: 12 }}>
                  {typeof icon === 'string' ? (
                    <Ionicons name={icon} size={size === 'sm' ? 18 : 24} color={getTextColor()} />
                  ) : (
                    icon
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100, // Pill shape dictates the shadow shape now!
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  btnPrimaryShadow: {
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6, // Lowered slightly so Android doesn't over-render the edges
  },
  btnSecondaryBorder: {
    borderWidth: 2,
    borderColor: '#2D6A4F',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  contentRow: {
    flexDirection: 'row-reverse', // Strict RTL for iconic layouts
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedState: {
    opacity: 0.9,
  }
});