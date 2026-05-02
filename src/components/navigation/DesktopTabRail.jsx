import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing } from '../../theme/theme';

const RAIL_WIDTH = 260;

// Premium Tokens matching the Cinematic UI
const COLORS = {
  primary: '#2D6A4F',
  primaryHover: '#1B4332',
  bgMain: '#F8F9FA',
  bgWhite: '#FFFFFF',
  textMain: '#0F172A',
  textLight: '#94A3B8',
  border: 'rgba(15, 23, 42, 0.08)',
};

/**
 * Vertical navigation for wide layouts (web / tablets).
 * Features a static layout (no scroll) with clean active state indications.
 */
export default function DesktopTabRail({ basePath, items }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const active = segments[segments.length - 1];

  const go = (name) => {
    const path = `${basePath}/${name}`.replace(/\/+/g, '/');
    router.push(path);
  };

  const webCursor = Platform.OS === 'web' ? { cursor: 'pointer' } : {};

  return (
    <View
      style={[
        styles.rail,
        {
          width: RAIL_WIDTH,
          backgroundColor: theme.isDark ? '#0A0A1A' : COLORS.bgMain, // Match root background
          borderEndWidth: 1,
          borderEndColor: theme.isDark ? 'rgba(255,255,255,0.05)' : COLORS.border,
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
    >
      {/* Brand Header */}
      <View style={styles.header}>
        <View style={[styles.logoCircle, { backgroundColor: COLORS.primary }]}>
          <Ionicons name="local-fire-department" size={24} color={COLORS.bgWhite} />
        </View>
        <Text style={[styles.appName, { color: theme.isDark ? COLORS.bgWhite : COLORS.primary }]}>كودفيلات</Text>
      </View>

      {/* Static Tabs Container (No ScrollView, all visible at once) */}
      <View style={styles.tabsContainer}>
        {items.map((item) => {
          const focused = active === item.name;
          const iconName = focused ? item.icon : `${item.icon}-outline`;

          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.row,
                focused && { backgroundColor: theme.isDark ? 'rgba(45, 106, 79, 0.2)' : 'rgba(116, 198, 157, 0.15)' },
                webCursor,
              ]}
              onPress={() => go(item.name)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
            >
              {/* Clean Active Indicator Bar */}
              {focused && <View style={[styles.indicator, { backgroundColor: COLORS.primary }]} />}

              <Ionicons
                name={iconName}
                size={22}
                color={focused ? COLORS.primary : (theme.isDark ? '#94A3B8' : COLORS.textLight)}
              />
              <Text
                style={[
                  styles.label,
                  { color: focused ? COLORS.primary : (theme.isDark ? '#CBD5E1' : COLORS.textMain) },
                  focused && styles.labelFocused,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer Info */}
      <View style={[styles.footer, { borderTopColor: theme.isDark ? 'rgba(255,255,255,0.05)' : COLORS.border }]}>
        <Text style={[styles.version, { color: theme.isDark ? '#64748B' : COLORS.textLight }]}>نسخة 1.2.0 • قيد التطوير</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexShrink: 0,
    height: '100%',
    justifyContent: 'space-between', // Pushes header/tabs up and footer down
  },
  header: {
    flexDirection: 'row', // Strict RTL for Logo
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 40,
    gap: 12,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryHover,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  appName: {
    fontFamily: 'Tajawal_900Black',
    fontSize: 22,
    letterSpacing: -0.5,
    textAlign: 'right',
  },
  tabsContainer: {
    flex: 1, // Takes up remaining space
    paddingVertical: spacing.xs,
    gap: 8,
  },
  row: {
    flexDirection: 'row-reverse', // Strict RTL (icon right, text left)
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    borderRadius: 16, // Premium pill shape
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    right: 0, // Indicator on the right edge for RTL layout
    top: '25%',
    bottom: '25%',
    width: 4,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  label: {
    fontFamily: 'Tajawal_500Medium',
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
  },
  labelFocused: {
    fontFamily: 'Tajawal_800ExtraBold', // Heavy focus font
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
  version: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 12,
    textAlign: 'center',
  },
});