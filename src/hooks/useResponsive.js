import { useMemo } from 'react';
import { useWindowDimensions, Platform } from 'react-native';

/** Tablet landscape / small laptop — show side rail instead of bottom tabs */
export const BREAKPOINT_WIDE = 900;

/** Large desktop — optional denser grids / max width */
export const BREAKPOINT_DESKTOP = 1200;

export const MAX_CONTENT_WIDTH = 1280;

/**
 * Responsive layout helpers for web, tablets, and phones (including Android).
 * Uses width breakpoints so Android tablets get the wide layout too.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isWide = width >= BREAKPOINT_WIDE;
    const isDesktop = width >= BREAKPOINT_DESKTOP;
    const isWeb = Platform.OS === 'web';

    return {
      width,
      height,
      isWeb,
      isWide,
      isDesktop,
      /** Horizontal padding for main scroll/list areas */
      contentPadding: isWide ? 28 : 16,
      maxContentWidth: MAX_CONTENT_WIDTH,
      /** List bottom padding when bottom tab bar is hidden (wide rail) */
      listContentBottomPad: isWide ? 32 : 100,
    };
  }, [width, height]);
}
