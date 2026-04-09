import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { typography, borderRadius as themeRadius, spacing } from '../../theme/theme';

/**
 * Premium Solid Button component.
 * Features: Haptic feedback, smooth scaling, Forest/Mint green theme.
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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const getBackgroundColor = () => {
    if (disabled) return theme.isDark ? '#334155' : '#E5E7EB';
    switch (variant) {
      case 'primary':
        return theme.primary;
      case 'secondary':
        return theme.primaryLight + '15';
      case 'outline':
        return 'transparent';
      case 'danger':
        return '#DC2626';
      case 'ghost':
        return 'transparent';
      default:
        return theme.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textTertiary;
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
      case 'outline':
      case 'ghost':
        return theme.primary;
      default:
        return '#FFFFFF';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 16, height: 40 };
      case 'md':
        return { paddingVertical: 12, paddingHorizontal: 24, height: 52 };
      case 'lg':
        return { paddingVertical: 16, paddingHorizontal: 32, height: 64 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 24, height: 52 };
    }
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && styles.fullWidth, style]}>
      <TouchableOpacity
        onPress={() => {
           if (!disabled && !loading && onPress) {
             if (Platform.OS !== 'web') {
               Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
             }
             onPress();
           }
        }}
        disabled={disabled || loading}
        activeOpacity={0.85}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          getPadding(),
          { backgroundColor: getBackgroundColor() },
          variant === 'outline' && {
            borderWidth: 1.5,
            borderColor: disabled ? theme.colors.border : theme.primary,
          },
          fullWidth && styles.fullWidth,
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
      </TouchableOpacity>
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
});
