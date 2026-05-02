import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Platform, I18nManager } from 'react-native';
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
 * Features spacious geometric padding, RTL layout enforcement, 
 * and ambient color transitions matching the new platform aesthetic.
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

  // Premium Tokens
  const COLORS = {
    primary: '#2D6A4F',
    primaryLight: 'rgba(116, 198, 157, 0.08)',
    textMain: '#0F172A',
    textMuted: '#475569',
    textLight: '#94A3B8',
    border: 'rgba(15, 23, 42, 0.08)',
    bgWhite: '#FFFFFF',
    bgMain: '#F8F9FA',
    danger: '#EF4444',
  };

  // High-performance shared value for focus state (0 = blurred, 1 = focused)
  const focusAnim = useSharedValue(0);

  React.useEffect(() => {
    focusAnim.value = withTiming(focused ? 1 : 0, { duration: 300 });
  }, [focused]);

  // Smoothly interpolate background and border colors on the UI thread
  const containerStyle = useAnimatedStyle(() => {
    const borderColor = error
      ? COLORS.danger
      : interpolateColor(
        focusAnim.value,
        [0, 1],
        [COLORS.border, COLORS.primary]
      );

    const backgroundColor = interpolateColor(
      focusAnim.value,
      [0, 1],
      [theme.isDark ? '#1E293B' : COLORS.bgMain, theme.isDark ? '#0F172A' : COLORS.bgWhite]
    );

    return {
      borderColor,
      backgroundColor,
    };
  });

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.isDark ? '#CBD5E1' : COLORS.textMain }]}>
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          styles.container,
          containerStyle,
          focused && !error && styles.focusedShadow,
          multiline ? { minHeight: Math.max(100, numberOfLines * 28), alignItems: 'flex-start' } : null,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={22}
            color={error ? COLORS.danger : (focused ? COLORS.primary : COLORS.textLight)}
            style={styles.icon}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={COLORS.primary}
          style={[
            styles.input,
            { color: theme.isDark ? '#FFFFFF' : COLORS.textMain },
            multiline ? { textAlignVertical: 'top', paddingTop: 18 } : null,
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
              size={22}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Animated Error Entrance */}
      {error && (
        <Animated.View entering={FadeInUp.duration(400).springify()} style={styles.errorContainer}>
          <Text style={[styles.error, { color: COLORS.danger }]}>{error}</Text>
          <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
    width: '100%',
  },
  label: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 16,
    marginBottom: 10,
    marginEnd: 4,
    textAlign: 'right', // Force RTL alignment
    writingDirection: 'rtl',
    width: '100%',
  },
  container: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'row-reverse', // Strict visual RTL layout
    alignItems: 'center',
    borderRadius: 20, // Premium modern border radius
    paddingHorizontal: 16,
    borderWidth: 1.5, // Thicker border for modern spatial feel
    minHeight: 64, // Taller inputs for better touch targets
    gap: 12,
    ...Platform.select({
      web: { outlineStyle: 'none', transition: 'box-shadow 0.3s ease' },
    }),
  },
  focusedShadow: {
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  icon: {
    // Spacer handled by gap
  },
  input: {
    flex: 1,
    minWidth: 0, // Prevents flex overflow on Android
    fontFamily: 'Tajawal_500Medium',
    fontSize: 16,
    paddingVertical: 16,
    textAlign: 'right', // Force Arabic alignment
    writingDirection: 'rtl',
  },
  eyeIcon: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 8,
    marginEnd: 4,
    gap: 6,
  },
  error: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 14,
  },
});