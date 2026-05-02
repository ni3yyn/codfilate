import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// Premium Tokens matching the Cinematic UI
const COLORS = {
  primary: '#2D6A4F',
  primaryHover: '#1B4332',
  bgMain: '#F8F9FA',
  bgWhite: '#FFFFFF',
  textMain: '#0F172A',
  textLight: '#94A3B8',
  border: 'rgba(15, 23, 42, 0.06)', // Softer border for small cards
};

/**
 * Compact StatCard — horizontal layout for mobile.
 * Re-architected for Reanimated performance and premium cinematic shadows.
 * Kept strictly compact and native-RTL dependent.
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
  const accentColor = color || COLORS.primary;

  const ContentWrapper = animate ? Animated.View : View;

  // Consistent high-performance entry animation
  const reanimatedProps = animate ? {
    entering: FadeInDown.delay(50).springify().damping(18).stiffness(120)
  } : {};

  // Premium Border Architecture
  const cardBorder = theme.isDark
    ? 'rgba(255, 255, 255, 0.05)' // Crisp hairline contrast for dark mode
    : COLORS.border;

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
          Platform.OS === 'web' && { className: 'glass-panel' },
          {
            backgroundColor: theme.isDark ? "rgba(30, 41, 59, 0.8)" : COLORS.bgWhite,
            borderColor: cardBorder,
            borderWidth: 1,
          },
          !theme.isDark && styles.premiumShadow
        ]}
      >
        {/* Horizontal layout: icon | text block (RTL natively maps to right-to-left) */}
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: accentColor + '15' }]}>
            <Ionicons
              name={icon || 'stats-chart'}
              size={18} // Kept small
              color={accentColor}
            />
          </View>
          <View style={styles.textBlock}>
            <View style={styles.valueRow}>
              <Text
                style={[styles.value, { color: theme.isDark ? '#FFFFFF' : COLORS.textMain }]}
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
                        ? 'rgba(116, 198, 157, 0.15)'
                        : 'rgba(239, 68, 68, 0.12)',
                    },
                  ]}
                >
                  <Ionicons
                    name={trendUp ? 'trending-up' : 'trending-down'}
                    size={10}
                    color={trendUp ? '#2D6A4F' : '#EF4444'}
                  />
                  <Text
                    style={[
                      styles.trendText,
                      { color: trendUp ? '#2D6A4F' : '#EF4444' },
                    ]}
                  >
                    {trend}%
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.title, { color: theme.isDark ? '#CBD5E1' : COLORS.textMuted }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={[styles.subtitle, { color: theme.isDark ? '#64748B' : COLORS.textLight }]}
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
    minWidth: 140, // Keeps it compact
  },
  card: {
    borderRadius: 16, // Smooth cinematic radius
    padding: 12, // Slightly dialed in for breathing room without bloat
    overflow: 'hidden',
  },
  premiumShadow: {
    shadowColor: COLORS.primaryHover,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2, // Very subtle elevation to prevent Android square bugs
  },
  row: {
    flexDirection: 'row', // Left intact for I18nManager handling
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  iconBox: {
    width: 36, // Compact
    height: 36, // Compact
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start', // Hugs the natural RTL edge
  },
  valueRow: {
    flexDirection: 'row', // Left intact for I18nManager
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  value: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 16, // Kept small
    letterSpacing: -0.3,
  },
  trendBadge: {
    flexDirection: 'row', // Left intact
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  trendText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 9, // Kept small
  },
  title: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 11, // Kept small
    lineHeight: 14,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 9, // Kept small
    lineHeight: 12,
    marginTop: 1,
  },
});