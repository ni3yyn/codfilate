import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '../../theme/theme';
import { useTheme } from '../../hooks/useTheme';

/**
 * Premium Badge component.
 * Supports Forest/Mint theme variants and pulsing indicators.
 */
export default function Badge({
  label,
  variant = 'primary',
  size = 'sm',
  icon,
  pulse = false,
  style,
}) {
  const theme = useTheme();
  
  const VARIANT_COLORS = {
    success: { bg: 'rgba(0, 184, 148, 0.12)', text: '#00B894', border: 'rgba(0, 184, 148, 0.2)' },
    warning: { bg: 'rgba(253, 203, 110, 0.12)', text: '#F0B429', border: 'rgba(253, 203, 110, 0.2)' },
    error: { bg: 'rgba(255, 107, 107, 0.12)', text: '#FF6B6B', border: 'rgba(255, 107, 107, 0.2)' },
    info: { bg: 'rgba(116, 185, 255, 0.12)', text: '#74B9FF', border: 'rgba(116, 185, 255, 0.2)' },
    primary: { 
      bg: theme.primary + '15', 
      text: theme.primary, 
      border: theme.primary + '25' 
    },
    neutral: { bg: 'rgba(156, 163, 175, 0.10)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.15)' },
  };

  const colorSet = VARIANT_COLORS[variant] || VARIANT_COLORS.primary;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulse) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [pulse]);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colorSet.bg,
          borderColor: colorSet.border,
          borderWidth: 1,
        },
        size === 'lg' ? styles.badgeLg : null,
        style,
      ]}
    >
      {pulse && (
        <Animated.View
          style={[
            styles.pulseDot,
            {
              backgroundColor: colorSet.text,
              opacity: pulseAnim,
            },
          ]}
        />
      )}
      {icon && (
        <Ionicons
          name={icon}
          size={size === 'lg' ? 14 : 11}
          color={colorSet.text}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          { color: colorSet.text },
          size === 'lg' ? styles.textLg : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeLg: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginEnd: 6,
  },
  icon: {
    marginEnd: 4,
  },
  text: {
    ...typography.small,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textLg: {
    fontSize: 12,
  },
});
