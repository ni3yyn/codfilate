import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing } from '../../theme/theme';

/**
 * Premium Loading Spinner.
 * Upgraded to use react-native-reanimated for 60fps infinite loops on the UI thread.
 */
export default function LoadingSpinner({ size = 'large', style, message }) {
  const theme = useTheme();
  
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    // Continuous 360 rotation on UI thread
    rotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1, // infinite
      false // don't reverse
    );

    // Continuous pulse in/out
    scale.value = withRepeat(
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true // reverse
    );
  }, []);

  const spinnerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: scale.value, 
    };
  });

  const dotSize = size === 'large' ? 48 : 32;

  return (
    <View style={[styles.container, style]}>
      {/* Outer Rotating Ring */}
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
          },
          spinnerStyle
        ]}
      />
      
      {/* Inner Pulsing Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            width: dotSize - 16,
            height: dotSize - 16,
            borderRadius: (dotSize - 16) / 2,
            backgroundColor: theme.primary + '15',
          },
          logoStyle
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

      {/* Optional Loading Message */}
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
