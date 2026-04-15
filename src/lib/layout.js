import { Platform } from 'react-native';

/**
 * Common layout constants for the application navigation
 */
export const DOCK_HEIGHT = 56;
export const FAB_GAP = 16;

/**
 * Shared logic for calculating the bottom padding of the navigation dock
 * and other floating elements (like FABs) that must sit above the dock.
 * 
 * Handles safe area insets, platform-specific variances, and the
 * "Android physical buttons" edge case.
 */
export const getBottomTabPadding = (insets) => {
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';

  // 1. Get the base inset from the system (safe area)
  let baseSpace = insets.bottom;

  // 2. Handle the "Invisible Insets" edge case:
  // If we're on Android and insets are 0, there's a high chance physical buttons are 
  // present but not reported (common in some configs). 
  if (isAndroid && baseSpace === 0) {
    baseSpace = 48;
  } else if (isWeb && baseSpace === 0) {
    baseSpace = 24; // Standard browser bottom bar buffer
  } else if (baseSpace === 0) {
    baseSpace = 8; // Minimal fallback
  }

  // 3. Add a float offset to elevate the bar elegantly above the edge
  // This is the "air" between the dock and the screen edge.
  const floatOffset = isAndroid ? 16 : 14;
  
  return baseSpace + floatOffset;
};
