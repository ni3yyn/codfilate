import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../theme/theme';

/**
 * Premium Empty State Component
 * Features a snappy spring entrance animation and cinematic typography.
 */
export default function EmptyState({
  icon = 'cube-outline',
  title = 'لا يوجد شيء هنا بعد',
  message = 'ستظهر العناصر بمجرد إضافتها.',
  style,
}) {
  const theme = useTheme();

  // High-tension entrance animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        },
        style
      ]}
    >
      <LinearGradient
        colors={[
          theme.isDark ? 'rgba(116, 198, 157, 0.15)' : theme.primary + '15',
          theme.isDark ? 'rgba(116, 198, 157, 0.05)' : theme.primary + '05'
        ]}
        style={styles.iconWrapper}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={48} color={theme.primary} />
      </LinearGradient>

      <Text style={[styles.title, { color: theme.isDark ? '#FFFFFF' : theme.colors.text }]}>
        {title}
      </Text>

      <Text style={[styles.message, { color: theme.isDark ? '#94A3B8' : theme.colors.textSecondary }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    paddingTop: spacing.xxxl,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50, // This forces both the gradient AND the shadow to be circular
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(116, 198, 157, 0.2)',
    marginBottom: 24,
    // Shadows applied directly to the circular element
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 3, // Lowered slightly to prevent Android from over-rendering the edge
  },
  title: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 22,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
});