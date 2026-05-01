import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, typography, shadows } from '../../theme/theme';

/**
 * Compact StatCard — horizontal layout for mobile.
 * Re-architected for Reanimated performance and premium solid borders.
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
  const accentColor = color || theme.primary;

  const ContentWrapper = animate ? Animated.View : View;
  
  // Consistent high-performance entry animation
  const reanimatedProps = animate ? {
    entering: FadeInDown.delay(50).springify().damping(18).stiffness(120)
  } : {};

  // Premium Border & Shadow Architecture matching Card.jsx
  const cardBorder = theme.isDark
    ? 'rgba(255, 255, 255, 0.08)' // Crisp hairline contrast for dark mode
    : 'rgba(0, 0, 0, 0.04)';      // Soft ambient contrast for light mode

  const borderStyle = {
    borderColor: cardBorder,
    borderWidth: Platform.OS === 'web' ? 1 : StyleSheet.hairlineWidth,
  };

  return (
    <ContentWrapper
      {...reanimatedProps}
      style={[
        styles.wrapper,
        style,
      ]}
    >
      <View
        style={[
          styles.card,
          borderStyle,
          theme.isDark ? shadows.glow : shadows.sm,
          { backgroundColor: theme.isDark ? theme.colors.surface : '#FFFFFF' },
        ]}
      >
        {/* Horizontal layout: icon | text block (RTL natively maps to right-to-left) */}
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
    </ContentWrapper>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: 140,
  },
  card: {
    borderRadius: 14,
    padding: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
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
    alignItems: 'flex-start', // Ensures text blocks correctly hug the RTL start (right edge)
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
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
