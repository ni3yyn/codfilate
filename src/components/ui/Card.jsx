import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing, animation, shadows } from '../../theme/theme';

/**
 * Premium Solid Card component. 
 * Removed all glassmorphism/blur as per user request.
 */
export default function Card({
  children,
  style,
  elevated = false,
  noPadding = false,
  animate = false,
  accentColor,
  accentPosition = 'top', // 'top', 'left'
  borderVariant = 'default', // 'default' | 'none' | 'thick'
  gradient = false,
  gradientColors,
}) {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(animate ? 10 : 0)).current;

  useEffect(() => {
    if (animate) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: animation.normal,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          ...animation.springBouncy, // Use bouncy spring config from theme
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  const cardBorder = borderVariant === 'none' 
    ? 'transparent' 
    : theme.isDark 
      ? 'rgba(255, 255, 255, 0.06)' 
      : 'rgba(0, 0, 0, 0.05)';

  const cardShadow = elevated ? (theme.isDark ? shadows.glow : shadows.md) : {};

  const ContentWrapper = animate ? Animated.View : View;
  const InnerContainer = gradient ? LinearGradient : View;
  const innerProps = gradient ? { colors: gradientColors || [theme.primary, theme.primaryLight], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } : {};

  return (
    <ContentWrapper
      style={[
        styles.card,
        {
          backgroundColor: gradient ? 'transparent' : theme.colors.card,
          borderColor: cardBorder,
          borderWidth: borderVariant === 'thick' ? 2 : 1,
          ...cardShadow,
        },
        animate && {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        (noPadding || gradient) ? null : styles.padding,
        style,
      ]}
    >
      <InnerContainer
        {...innerProps}
        style={gradient ? [StyleSheet.absoluteFill, noPadding ? null : styles.padding, { justifyContent: 'center' }] : null}
      >
        {accentColor && !gradient && (
          <View
            style={[
              styles.accent,
              accentPosition === 'top' ? styles.accentTop : styles.accentLeft,
              { backgroundColor: accentColor },
            ]}
          />
        )}
        {children}
      </InnerContainer>
    </ContentWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  padding: {
    padding: spacing.md,
  },
  accent: {
    position: 'absolute',
    borderRadius: 2,
  },
  accentTop: {
    top: 4,
    left: spacing.lg,
    right: spacing.lg,
    height: 3,
  },
  accentLeft: {
    top: spacing.lg,
    bottom: spacing.lg,
    left: 0,
    width: 4,
    borderTopStartRadius: 0,
    borderBottomStartRadius: 0,
  },
});
