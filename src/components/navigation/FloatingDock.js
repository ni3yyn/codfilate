import { StyleSheet, Platform } from 'react-native';

/**
 * Shared floating dock tab bar styles.
 * Used across all role layouts for consistent mobile navigation.
 *
 * Design: Premium floating pill dock with frosted glass effect,
 * rounded corners, raised from bottom edge with shadow.
 */

/**
 * Returns the shared tabBarStyle for the floating dock.
 * @param {object} theme - The current theme object from useTheme()
 * @param {boolean} isWide - Whether the screen is wide (desktop)
 * @returns {object} tabBarStyle configuration
 */
export function getFloatingDockStyle(theme, isWide) {
  if (isWide) return { display: 'none' };

  return {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 12,
    left: 16,
    right: 16,
    backgroundColor: theme.isDark
      ? 'rgba(15, 23, 42, 0.92)'
      : 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 0,
    borderRadius: 20,
    height: 64,
    paddingBottom: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: theme.isDark ? 0.4 : 0.12,
    shadowRadius: 24,
    borderWidth: 1,
    borderColor: theme.isDark
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.04)',
  };
}

/**
 * Returns the shared tabBarItemStyle for floating dock items.
 */
export const floatingDockItemStyle = {
  paddingVertical: 0,
  height: 64,
  justifyContent: 'center',
  alignItems: 'center',
};

/**
 * Shared StyleSheet for the floating dock tab icons.
 */
export const dockStyles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 14,
    minWidth: 40,
  },
  tabItemActive: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tabLabel: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 11,
    marginStart: 2,
  },
});
