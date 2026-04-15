import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, typography } from '../../theme/theme';

/**
 * Compact StatCard — horizontal layout for mobile.
 * Icon on left, value + title stacked on right.
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
  const scaleIn = useRef(new Animated.Value(animate ? 0.97 : 1)).current;
  const opacityIn = useRef(new Animated.Value(animate ? 0 : 1)).current;

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

  return (
    <Animated.View
      style={[
        styles.wrapper,
        animate && {
          opacity: opacityIn,
          transform: [{ scale: scaleIn }],
        },
        style,
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.isDark ? theme.colors.surface : '#FFFFFF',
            borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          },
        ]}
      >
        {/* Horizontal layout: icon | text block */}
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: accentColor + '12' }]}>
            <Ionicons
              name={icon || 'stats-chart'}
              size={18}
              color={accentColor}
            />
          </View>
          <View style={styles.textBlock}>
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
                    styles.trendBadge,
                    {
                      backgroundColor: trendUp
                        ? 'rgba(0, 184, 148, 0.12)'
                        : 'rgba(255, 107, 107, 0.12)',
                    },
                  ]}
                >
                  <Ionicons
                    name={trendUp ? 'trending-up' : 'trending-down'}
                    size={10}
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
            <Text
              style={[styles.title, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={[styles.subtitle, { color: theme.colors.textTertiary }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: 140,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 16,
    letterSpacing: -0.3,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 20,
  },
  trendText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 9,
  },
  title: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 11,
    lineHeight: 14,
  },
  subtitle: {
    fontFamily: 'Tajawal_400Regular',
    fontSize: 9,
    lineHeight: 12,
    marginTop: 1,
  },
});
