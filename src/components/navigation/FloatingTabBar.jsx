import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomTabPadding } from '../../lib/layout';

// Premium Tokens for Cinematic App.js matching
const COLORS = {
  primary: '#2D6A4F',
  primaryHover: '#1B4332',
  bgWhite: '#FFFFFF',
  textMain: '#0F172A',
  textLight: '#94A3B8',
  border: 'rgba(15, 23, 42, 0.08)',
};

// Extracted Tab Button to handle its own high-performance spring animation
const TabButton = ({ route, options, focused, onPress, theme }) => {
  // Safe instantiation of Animated.Value
  const animValue = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: focused ? 1 : 0,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  const iconName = options.tabBarIconName;
  const resolvedIcon = focused ? iconName : `${iconName}-outline`;
  const color = focused ? COLORS.primary : (theme.isDark ? '#64748B' : COLORS.textLight);

  // Smooth interpolations for premium feel
  const iconTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6] // Lifts up when active
  });

  const iconScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15] // Slightly enlarges when active
  });

  const dotScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1] // Pops in
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.tab}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={options.title}
    >
      <Animated.View style={{ transform: [{ scale: iconScale }, { translateY: iconTranslateY }] }}>
        <Ionicons name={resolvedIcon} size={24} color={color} />
      </Animated.View>

      {/* Animated Glowing Dot underneath the icon */}
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: COLORS.primary,
            transform: [{ scale: dotScale }],
            opacity: animValue,
            shadowColor: COLORS.primary,
          }
        ]}
      />
    </TouchableOpacity>
  );
};

export default function FloatingTabBar({ state, descriptors, navigation, theme }) {
  const insets = useSafeAreaInsets();

  // Calculate responsive bottom padding using unified logic
  const bottomPad = React.useMemo(() => {
    return getBottomTabPadding(insets);
  }, [insets.bottom]);

  const visibleTabs = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    if (!options.tabBarIconName) return false;
    if (options.href === null) return false;
    if (options.tabBarStyle?.display === 'none') return false;
    return true;
  });

  return (
    <View style={[styles.outer, { paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === 'web' ? 20 : 16) }]} pointerEvents="box-none">
      <View
        style={[
          styles.dock,
          Platform.OS === 'web' && { className: 'glass-panel' },
          {
            backgroundColor: theme.isDark
              ? 'rgba(15, 23, 42, 0.85)' // More transparent for better glass effect
              : 'rgba(255, 255, 255, 0.90)',
            borderColor: theme.isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : COLORS.border,
            shadowColor: theme.isDark ? '#000' : COLORS.primaryHover,
          },
        ]}
      >
        {visibleTabs.reverse().map((route) => {
          const { options } = descriptors[route.key];
          const routeIndex = state.routes.indexOf(route);
          const focused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton
              key={route.key}
              route={route}
              options={options}
              focused={focused}
              onPress={onPress}
              theme={theme}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24, // Wider breathing room on sides
    zIndex: 100, // Ensure it floats above content
  },
  dock: {
    flexDirection: 'row-reverse', // Strict RTL: Places the first tab (e.g., Home) on the Right side
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 480, // Caps width on tablets/web so it doesn't stretch infinitely
    height: 70, // Premium taller height
    borderRadius: 35, // Perfect pill shape
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 25,
    elevation: 20,
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    bottom: 14, // Exact positioning below the lifted icon
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
});