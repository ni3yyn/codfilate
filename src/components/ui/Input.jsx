import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, I18nManager, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, typography, animation, borderRadius } from '../../theme/theme';

/**
 * Premium Solid Input component.
 * Features: Background fill, subtle focus animation, consistent typography.
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

  const borderFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderFade, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const borderColor = error
    ? theme.error
    : borderFade.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.border, theme.primary],
      });

  const backgroundColor = focused 
    ? theme.colors.surface 
    : theme.colors.surface2;

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
          {
            backgroundColor,
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
          },
          multiline ? { minHeight: Math.max(80, numberOfLines * 24), alignItems: 'flex-start' } : null,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={focused ? theme.primary : theme.colors.textTertiary}
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
            {
              color: theme.colors.text,
            },
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
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={theme.error} />
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        </View>
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
    marginStart: 4,
  },
  container: {
    flexDirection: 'row-reverse', // RTL alignment for the input container elements
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }),
  },
  icon: {
    marginStart: 12,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: 14,
    textAlign: 'right', // Force Arabic alignment
  },
  eyeIcon: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 6,
    marginStart: 4,
    gap: 4,
  },
  error: {
    ...typography.caption,
    fontFamily: 'Tajawal_500Medium',
  },
});
