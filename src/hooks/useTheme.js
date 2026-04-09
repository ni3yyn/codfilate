import React from 'react';
import { useThemeStore } from '../stores/useThemeStore';
import { colors } from '../theme/theme';

export const useThemeColors = () => {
  const mode = useThemeStore((s) => s.mode);
  return mode === 'dark' ? colors.dark : colors.light;
};

export const useTheme = () => {
  const mode = useThemeStore((s) => s.mode);
  const storeTheme = useThemeStore((s) => s.storeTheme);
  const themeColors = mode === 'dark' ? colors.dark : colors.light;

  return {
    mode,
    colors: themeColors,
    primary: storeTheme?.primary || colors.primary,
    primaryDark: colors.primaryDark,
    secondary: storeTheme?.secondary || colors.primaryLight,
    accent: storeTheme?.accent || colors.accent,
    isDark: mode === 'dark',
  };
};
