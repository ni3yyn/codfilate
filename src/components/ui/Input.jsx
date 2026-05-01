import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  interpolateColor,
  FadeInUp
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, typography, borderRadius } from '../../theme/theme';

/**
 * Premium Solid Input component.
 * Upgraded with Reanimated for smooth background and border color interpolation,
 * and stable borders to prevent layout shifts.
 */
export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  error,
  icon,
  editable = true,
  style,
  inputStyle,
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // High-performance shared value for focus state (0 = blurred, 1 = focused)
  const focusAnim = useSharedValue(0);

  React.useEffect(() => {
    focusAnim.value = withTiming(focused ? 1 : 0, { duration: 250 });
  }, [focused]);

  // Smoothly interpolate background and border colors on the UI thread
  const containerStyle = useAnimatedStyle(() => {
    const borderColor = error 
      ? theme.error 
      : interpolateColor(
          focusAnim.value,
          [0, 1],
          [theme.colors.border, theme.primary]
        );

    const backgroundColor = interpolateColor(
      focusAnim.value,
      [0, 1],
      [theme.colors.surface2, theme.colors.surface]
    );

    return {
      borderColor,
      backgroundColor,
    };
  });

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          styles.container,
          containerStyle,
          multiline ? { minHeight: Math.max(80, numberOfLines * 24), alignItems: 'flex-start' } : null,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? theme.error : (focused ? theme.primary : theme.colors.textTertiary)}
            style={styles.icon}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={theme.primary}
          style={[
            styles.input,
            { color: theme.colors.text },
            multiline ? { textAlignVertical: 'top', paddingTop: 14 } : null,
            inputStyle,
          ]}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
      
      {/* Animated Error Entrance */}
      {error && (
        <Animated.View entering={FadeInUp.duration(300).springify()} style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={theme.error} />
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    ...typography.small,
    fontFamily: 'Tajawal_700Bold',
    marginBottom: 8,
    marginEnd: 4,
    textAlign: 'right', // Force RTL alignment
    writingDirection: 'rtl',
    width: '100%',
  },
  container: {
    flexDirection: 'row', // RTL alignment natively handled by I18nManager
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    borderWidth: 1, // Fixed border width to prevent layout shifting
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }),
  },
  icon: {
    marginEnd: 12,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: 14,
    textAlign: 'right', // Force Arabic alignment
    writingDirection: 'rtl',
  },
  eyeIcon: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 6,
    marginEnd: 4,
    gap: 4,
  },
  error: {
    ...typography.caption,
    fontFamily: 'Tajawal_500Medium',
  },
});
