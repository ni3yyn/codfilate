import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFABStore } from '../../stores/useFABStore';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { getBottomTabPadding } from '../../lib/layout';

// Premium Tokens matching the App.js landing page system
const COLORS = {
  primary: '#2D6A4F',
  primaryHover: '#1B4332',
  bgWhite: '#FFFFFF',
};

/**
 * UniversalFAB — Rendered once in each role _layout.jsx.
 * Upgraded with Prestige Spring Physics, heavy typography, and precise dock-clearing math.
 */
export default function UniversalFAB() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useResponsive();

  const icon = useFABStore((s) => s.icon);
  const label = useFABStore((s) => s.label);
  const onPress = useFABStore((s) => s.onPress);
  const visible = useFABStore((s) => s.visible);

  // Entrance & Exit Animation
  const visibilityAnim = useRef(new Animated.Value(0)).current;

  // High-Tension Press Animation
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(visibilityAnim, {
      toValue: visible ? 1 : 0,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handlePressIn = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(pressAnim, {
      toValue: 0.94,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (onPress) onPress();
  };

  // Calculate bottom position dynamically to ALWAYS clear the new FloatingTabBar
  const bottomPosition = React.useMemo(() => {
    const isWeb = Platform.OS === 'web';

    if (isWide) {
      // On wide screens (Desktop), FloatingTabBar is hidden.
      // Offset from the bottom edge directly.
      return Math.max(insets.bottom, isWeb ? 32 : 24) + 16;
    }

    // On mobile, floating exactly above the navigation dock
    // 1. basePadding = Safe area insets (from getBottomTabPadding)
    // 2. tabOuterPadding = the extra padding we added to the FloatingTabBar outer wrapper
    // 3. dockHeight = The new 70px height of the Floating dock
    // 4. gap = The breathing room between dock and FAB
    const basePadding = insets.bottom > 0 ? insets.bottom : (isWeb ? 24 : 16);
    const dockHeight = 70;
    const gap = 16;

    return basePadding + dockHeight + gap;
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
          opacity: visibilityAnim,
          transform: [
            { scale: visibilityAnim },
            { scale: pressAnim } // Combines visibility scaling with press scaling
          ],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.fab,
          {
            backgroundColor: COLORS.primary, // Force premium brand color
            shadowColor: COLORS.primary,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label || 'Action button'}
      >
        <Ionicons name={icon || 'add'} size={24} color={COLORS.bgWhite} />
        {label ? (
          <Text style={styles.label}>{label}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999, // Super high zIndex to ensure it overlays everything
  },
  fab: {
    flexDirection: 'row-reverse', // Strict RTL placement (Icon Right, Text Left)
    alignItems: 'center',
    paddingHorizontal: 24,
    minHeight: 56, // Generous touch target
    borderRadius: 28, // Perfect pill
    gap: 10,
    // Explosive Shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  label: {
    color: COLORS.bgWhite,
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 16,
    letterSpacing: -0.3,
  },
});