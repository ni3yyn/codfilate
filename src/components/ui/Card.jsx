import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing, shadows } from '../../theme/theme';

/**
 * Premium Solid Card component. 
 * Re-architected for Reanimated performance, unified gradient layers, and true RTL accents.
 */
export default function Card({
  children,
  style,
  elevated = false,
  noPadding = false,
  animate = false,
  accentColor,
  accentPosition = 'top', // 'top' | 'bottom' | 'left' | 'right' | 'start' | 'end'
  borderVariant = 'default', // 'default' | 'none' | 'thick'
  gradient = false,
  gradientColors,
}) {
  const theme = useTheme();

  // Unified gradient configuration
  const hasGradient = gradient || !!gradientColors;
  const gradientProps = hasGradient ? {
    colors: gradientColors || [theme.primary, theme.primaryLight],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 }
  } : null;

  // Premium Border & Shadow Architecture
  const cardBorder = borderVariant === 'none'
    ? 'transparent'
    : theme.isDark
      ? 'rgba(255, 255, 255, 0.08)' // Crisp hairline contrast for dark mode
      : 'rgba(0, 0, 0, 0.04)';      // Soft ambient contrast for light mode

  const cardShadow = elevated ? (theme.isDark ? shadows.glow : shadows.md) : {};

  // Comprehensive Accent Positioning (RTL-aware)
  const getAccentStyle = () => {
    if (!accentColor) return null;
    
    const baseAccent = {
      position: 'absolute',
      backgroundColor: accentColor,
      zIndex: 1,
    };

    switch (accentPosition) {
      case 'top':
        return { ...baseAccent, top: 0, left: 0, right: 0, height: 4 };
      case 'bottom':
        return { ...baseAccent, bottom: 0, left: 0, right: 0, height: 4 };
      case 'left':
        return { ...baseAccent, top: 0, bottom: 0, left: 0, width: 4 };
      case 'right':
        return { ...baseAccent, top: 0, bottom: 0, right: 0, width: 4 };
      case 'start':
        return { ...baseAccent, top: 0, bottom: 0, start: 0, width: 4 };
      case 'end':
        return { ...baseAccent, top: 0, bottom: 0, end: 0, width: 4 };
      default:
        return { ...baseAccent, top: 0, left: 0, right: 0, height: 4 };
    }
  };

  const ContentWrapper = animate ? Animated.View : View;

  // High-performance native entry animation
  const reanimatedProps = animate ? {
    entering: FadeInDown.delay(50).springify().damping(18).stiffness(120)
  } : {};

  const borderStyle = {
    borderColor: cardBorder,
    borderWidth: borderVariant === 'thick' ? 2 : (Platform.OS === 'web' ? 1 : StyleSheet.hairlineWidth),
  };

  return (
    <ContentWrapper
      {...reanimatedProps}
      style={[
        styles.card,
        borderStyle,
        cardShadow,
        { backgroundColor: hasGradient ? 'transparent' : theme.colors.card },
        style,
      ]}
    >
      {/* Unified Gradient Layer */}
      {hasGradient && (
        <LinearGradient {...gradientProps} style={StyleSheet.absoluteFill} />
      )}

      {/* Interactive Accent Layer */}
      {accentColor && <View style={getAccentStyle()} />}

      {/* Content Layer */}
      <View style={[styles.content, !noPadding && styles.padding]}>
        {children}
      </View>
    </ContentWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  padding: {
    padding: spacing.md,
  },
});
