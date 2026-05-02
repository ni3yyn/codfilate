import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

// Premium Tokens matching Cinematic UI
const COLORS = {
  primary: '#2D6A4F',
  accentMint: '#74C69D',
  bgWhite: '#FFFFFF',
  textMain: '#0F172A',
  textLight: '#94A3B8',
};

/**
 * Premium Loading Spinner.
 * Uses native Animated for 100% bug-free, GPU-accelerated infinite loops.
 * Fixed bounding-box layout ensures it never breaks parent flex rows.
 */
export default function LoadingSpinner({ size = 'large', style, message, fullScreen = false }) {
  const theme = useTheme();

  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // GPU-Accelerated Infinite Rotation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Smooth Breathing/Pulse Effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  // Safe string interpolation for rotation
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate strict dimensions so it doesn't break parent layouts
  const dotSize = size === 'large' ? 48 : 28;
  const innerSize = dotSize - (size === 'large' ? 16 : 10);
  const strokeWidth = size === 'large' ? 3 : 2;

  const content = (
    <View style={[styles.wrapper, style]}>
      {/* Strict Bounding Box for the animation */}
      <View style={{ width: dotSize, height: dotSize, justifyContent: 'center', alignItems: 'center' }}>

        {/* Outer Rotating Ring */}
        <Animated.View
          style={[
            styles.spinner,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              borderWidth: strokeWidth,
              borderColor: theme.isDark ? 'rgba(116, 198, 157, 0.1)' : 'rgba(45, 106, 79, 0.1)',
              borderTopColor: COLORS.primary,
              borderRightColor: COLORS.accentMint,
              transform: [{ rotate: spin }],
            }
          ]}
        />

        {/* Inner Pulsing Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: theme.isDark ? 'rgba(45, 106, 79, 0.3)' : 'rgba(116, 198, 157, 0.15)',
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim,
            }
          ]}
        >
          <Text
            style={[
              styles.logoText,
              {
                color: COLORS.primary,
                fontSize: innerSize * 0.55,
              },
            ]}
          >
            C
          </Text>
        </Animated.View>
      </View>

      {/* Optional Loading Message */}
      {message && (
        <Text style={[styles.message, { color: theme.isDark ? '#94A3B8' : COLORS.textLight }]}>
          {message}
        </Text>
      )}
    </View>
  );

  // If fullScreen prop is passed, wrap it in a flex: 1 container
  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor: theme.isDark ? '#0A0A1A' : COLORS.bgMain }]}>
        {content}
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    position: 'absolute', // Absolute inside the Strict Bounding Box, so it doesn't break layout
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  logoText: {
    fontFamily: 'Tajawal_900Black',
    marginTop: Platform.OS === 'ios' ? 2 : 0, // Visual center adjustment
  },
  message: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
});