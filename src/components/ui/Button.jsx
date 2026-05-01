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
 * Upgraded to Reanimated for native 60fps scaling.
 * Uses Pressable for explicit state control without the default opacity flicker.
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

  const handlePressIn = () => {
    if (disabled || loading) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Snappy, fast scale down
    scale.value = withSpring(0.96, { damping: 25, stiffness: 300, mass: 0.8 });
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    // Snappy, fast scale up
    scale.value = withSpring(1, { damping: 25, stiffness: 300, mass: 0.8 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getBackgroundColor = () => {
    if (disabled) return theme.isDark ? '#334155' : '#E5E7EB';
    switch (variant) {
      case 'primary': return theme.primary;
      case 'secondary': return theme.primaryLight + '15';
      case 'outline': return 'transparent';
      case 'danger': return '#DC2626';
      case 'ghost': return 'transparent';
      default: return theme.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textTertiary;
    switch (variant) {
      case 'primary':
      case 'danger': return '#FFFFFF';
      case 'secondary':
      case 'outline':
      case 'ghost': return theme.primary;
      default: return '#FFFFFF';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingVertical: 8, paddingHorizontal: 16, height: 40 };
      case 'md': return { paddingVertical: 12, paddingHorizontal: 24, height: 52 };
      case 'lg': return { paddingVertical: 16, paddingHorizontal: 32, height: 64 };
      default: return { paddingVertical: 12, paddingHorizontal: 24, height: 52 };
    }
  };

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
          variant === 'outline' && {
            borderWidth: 1, // Premium 1px instead of thick 1.5
            borderColor: disabled ? theme.colors.border : theme.primary,
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
              {icon && (
                <View style={{ marginEnd: 8 }}>
                  {typeof icon === 'string' ? (
                    <Ionicons name={icon} size={size === 'sm' ? 18 : 22} color={getTextColor()} />
                  ) : (
                    icon
                  )}
                </View>
              )}
              <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
                {title}
              </Text>
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: themeRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    ...typography.button,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedState: {
    opacity: 0.85, // Replaces TouchableOpacity's built-in flicker with a controlled dimming
  }
});
