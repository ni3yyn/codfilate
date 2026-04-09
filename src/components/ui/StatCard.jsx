import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import Card from './Card';
import { spacing, typography, animation, borderRadius as themeRadius } from '../../theme/theme';

/**
 * Premium StatCard component.
 * Features: Solid background icon container, subtle animations, clear typography.
 */
export default function StatCard({
  title,
  value,
  icon,
  color,
  trend,
  trendUp,
  style,
  subtitle,
  animate = true,
}) {
  const theme = useTheme();
  const scaleIn = useRef(new Animated.Value(animate ? 0.95 : 1)).current;
  const opacityIn = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animate) {
      Animated.parallel([
        Animated.spring(scaleIn, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityIn, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  const accentColor = color || theme.primary;

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.97,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[{ flex: 1, minWidth: 150 }, style]}
    >
      <Animated.View
        style={[
          styles.animWrapper,
          {
            opacity: opacityIn,
            transform: [{ scale: scaleIn }, { scale: pressScale }],
          },
          style,
        ]}
      >
        <Card style={styles.card} elevated={false}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: accentColor + '15' }]}>
              <Ionicons
                name={icon || 'stats-chart'}
                size={20}
                color={accentColor}
              />
            </View>
          </View>

          <View style={styles.valueRow}>
            <Text
              style={[styles.value, { color: theme.colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {value}
            </Text>
            {trend !== undefined && (
              <View
                style={[
                  styles.trendContainer,
                  {
                    backgroundColor: trendUp
                      ? 'rgba(0, 184, 148, 0.12)'
                      : 'rgba(255, 107, 107, 0.12)',
                  },
                ]}
              >
                <Ionicons
                  name={trendUp ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={trendUp ? '#00B894' : '#FF6B6B'}
                />
                <Text
                  style={[
                    styles.trendText,
                    { color: trendUp ? '#00B894' : '#FF6B6B' },
                  ]}
                >
                  {trend}%
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.title, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {title}
          </Text>

          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.colors.textTertiary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </Card>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  animWrapper: {
    flex: 1,
    minWidth: 150,
  },
  card: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trendText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 11,
  },
  value: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  title: {
    ...typography.small,
    fontFamily: 'Tajawal_700Bold',
  },
  subtitle: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 2,
  },
});
