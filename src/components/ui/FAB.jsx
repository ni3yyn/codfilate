import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFABStore } from '../../stores/useFABStore';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { getBottomTabPadding, DOCK_HEIGHT, FAB_GAP } from '../../lib/layout';

/**
 * UniversalFAB — Rendered once in each role _layout.jsx.
 * Reads from useFABStore to get the current screen's FAB config.
 * Positioned absolutely to float above the FloatingTabBar dock.
 */
export default function UniversalFAB() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useResponsive();

  const icon = useFABStore((s) => s.icon);
  const label = useFABStore((s) => s.label);
  const onPress = useFABStore((s) => s.onPress);
  const visible = useFABStore((s) => s.visible);

  // Animate in/out
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: visible ? 1 : 0,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  // Calculate bottom position — mirrors FloatingTabBar's bottomPad exactly
  const bottomPosition = React.useMemo(() => {
    const isWeb = Platform.OS === 'web';
    
    if (isWide) {
      // On wide screens (Desktop), FloatingTabBar is hidden.
      // Offset from the bottom edge directly.
      return Math.max(insets.bottom, isWeb ? 32 : 24) + 16;
    }
    
    // On mobile, floating exactly above the navigation dock
    const basePadding = getBottomTabPadding(insets);
    return basePadding + DOCK_HEIGHT + FAB_GAP;
  }, [insets.bottom, isWide]);

  const horizontalStyle = React.useMemo(() => {
    if (isWide) {
      return { left: 40, alignItems: 'flex-start' };
    }
    return { right: 20, alignItems: 'flex-end' };
  }, [isWide]);

  if (!onPress) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        horizontalStyle,
        { bottom: bottomPosition },
        {
          opacity: scaleAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            shadowColor: theme.primary,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label || 'Action button'}
      >
        <Ionicons name={icon || 'add'} size={22} color="#FFFFFF" />
        {label ? (
          <Text style={styles.label}>{label}</Text>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 999,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    elevation: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: 'Tajawal_700Bold',
    fontSize: 14,
  },
});
