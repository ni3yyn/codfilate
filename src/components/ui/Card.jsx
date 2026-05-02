import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../theme/theme';

// Premium Tokens matching Cinematic UI
const COLORS = {
  primary: '#2D6A4F',
  primaryHover: '#1B4332',
  bgWhite: '#FFFFFF',
  textMain: '#0F172A',
  border: 'rgba(15, 23, 42, 0.08)',
};

/**
 * Premium Solid Card component. 
 * Features smooth glassmorphic borders, prestige cinematic shapes, and true RTL accents.
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
    colors: gradientColors || [COLORS.primaryHover, COLORS.primary],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 }
  } : null;

  // Premium Border Architecture
  const cardBorder = borderVariant === 'none'
    ? 'transparent'
    : theme.isDark
      ? 'rgba(255, 255, 255, 0.06)' // Crisp hairline contrast for dark mode
      : COLORS.border;            // Soft ambient contrast for light mode

  // High-End Cinematic Shadow
  const cardShadow = elevated ? {
    shadowColor: theme.isDark ? '#000' : COLORS.primaryHover,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: theme.isDark ? 0.3 : 0.08,
    shadowRadius: 25,
    elevation: 8,
  } : {};

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
    borderWidth: borderVariant === 'thick' ? 2 : 1.5, // Thicker default border for glassmorphic spatial feel
  };

  return (
    <ContentWrapper
      {...reanimatedProps}
      style={[
        styles.card,
        borderStyle,
        cardShadow,
        elevated && { borderRadius: 30 }, // Larger radius for floating cards
        Platform.OS === 'web' && { className: 'glass-panel' },
        { backgroundColor: hasGradient ? 'transparent' : (theme.isDark ? 'rgba(30, 41, 59, 0.7)' : COLORS.bgWhite) },
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
    borderRadius: 24, // Premium soft radius
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  padding: {
    padding: 24, // Spacious padding
  },
});