import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomTabPadding } from '../../lib/layout';

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
    <View style={[styles.outer, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View
        style={[
          styles.dock,
          {
            backgroundColor: theme.isDark
              ? 'rgba(15, 23, 42, 0.95)'
              : 'rgba(255, 255, 255, 0.97)',
            borderColor: theme.isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        {visibleTabs.map((route) => {
          const { options } = descriptors[route.key];
          const routeIndex = state.routes.indexOf(route);
          const focused = state.index === routeIndex;
          const iconName = options.tabBarIconName;
          const resolvedIcon = focused ? iconName : `${iconName}-outline`;
          const color = focused
            ? theme.primary
            : theme.isDark
              ? '#64748B'
              : '#94A3B8';

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
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.title}
            >
              <Ionicons name={resolvedIcon} size={22} color={color} />
              {focused && (
                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>
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
    paddingHorizontal: 20,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});