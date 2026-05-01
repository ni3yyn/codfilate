import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing, borderRadius } from '../../theme/theme';

const RAIL_WIDTH = 260; // Slightly wider for more clarity

/**
 * Vertical navigation for wide layouts (web / tablets).
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
          backgroundColor: theme.colors.surface,
          borderEndWidth: 1,
          borderEndColor: theme.colors.border,
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.logoCircle, { backgroundColor: theme.primary + '15' }]}>
          <Text style={[styles.logoText, { color: theme.primary }]}>C</Text>
        </View>
        <Text style={[styles.appName, { color: theme.colors.text }]}>CODFILATE</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => {
          const focused = active === item.name;
          const iconName = focused ? item.icon : `${item.icon}-outline`;
          
          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.row,
                focused && { backgroundColor: theme.primary + '10' },
                webCursor,
              ]}
              onPress={() => go(item.name)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
            >
              {focused && <View style={[styles.indicator, { backgroundColor: theme.primary }]} />}
              
              <Ionicons
                name={iconName}
                size={22}
                color={focused ? theme.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.label,
                  { color: focused ? theme.primary : theme.colors.textSecondary },
                  focused && styles.labelFocused,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={[styles.version, { color: theme.colors.textTertiary }]}>v1.2.0 • Premium</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexShrink: 0,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 40,
    gap: 12,
  },
  logoCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 18,
  },
  appName: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 18,
    letterSpacing: 1,
  },
  scrollContent: {
    paddingVertical: spacing.xs,
    gap: 8,
  },
  row: {
    flexDirection: 'row-reverse', // Align items for Arabic (icon on right, text on left)
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 12,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    left: -12, // Inner edge for RTL (sidebar on the right)
    top: 12,
    bottom: 12,
    width: 4,
    borderTopEndRadius: 4,
    borderBottomEndRadius: 4,
  },
  label: {
    ...typography.body,
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
  },
  labelFocused: {
    fontFamily: 'Tajawal_700Bold',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  version: {
    ...typography.small,
    textAlign: 'center',
  },
});
