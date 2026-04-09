import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing } from '../../theme/theme';

export default function LoadingSpinner({ size = 'large', style, message }) {
  const theme = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spinValue = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dotSize = size === 'large' ? 48 : 32;

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            borderColor: theme.primary + '20',
            borderTopColor: theme.primary,
            borderRightColor: theme.primary + '60',
            transform: [{ rotate: spinValue }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.logoContainer,
          {
            width: dotSize - 16,
            height: dotSize - 16,
            borderRadius: (dotSize - 16) / 2,
            backgroundColor: theme.primary + '15',
            opacity: pulseAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Text
          style={[
            styles.logoText,
            {
              color: theme.primary,
              fontSize: (dotSize - 16) * 0.55,
            },
          ]}
        >
          C
        </Text>
      </Animated.View>
      {message && (
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  spinner: {
    borderWidth: 3,
    position: 'absolute',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontWeight: '800',
  },
  message: {
    ...typography.caption,
    marginTop: spacing.lg,
  },
});
