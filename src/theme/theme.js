// Theme Design System — White-Label SaaS
// Brand colors are derived from customer config at runtime.
// All other tokens (spacing, typography, etc.) remain universal.

import { appConfig } from '../lib/appConfig';

// Brand colors: Forest and Mint greens for a premium look
const forestGreen = '#2D6A4F';
const mintGreen = '#74C69D';
const darkForest = '#1B4332';
const softMint = '#D8F3DC';
const weakWhite = '#F8F9FA'; // Weak white to avoid eye strain

export const colors = {
  // Primary palette — Forest/Mint greens
  primary: forestGreen,
  primaryLight: mintGreen,
  primaryDark: darkForest,
  primaryGlow: `${forestGreen}40`,

  // Accent
  accent: mintGreen,
  accentLight: softMint,
  accentDark: forestGreen,

  // Status (universal)
  success: '#2D6A4F', // Solid forest green
  successLight: '#74C69D',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Light mode — Clean Premium (Solid colors)
  light: {
    background: weakWhite,
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surface2: '#F8FAFC', // Softest slate
    surface3: '#F1F5F9', // Softer slate
    text: '#0F172A', // Slate 900 for absolute crisp readability
    textSecondary: '#475569', // Slate 600
    textTertiary: '#94A3B8', // Slate 400
    border: '#E2E8F0', // Very subtle
    borderLight: '#F1F5F9', // Extremely subtle
    card: '#FFFFFF',
    cardGlass: '#FFFFFF', // Solid white
    overlay: 'rgba(15, 23, 42, 0.4)', // Premium slate overlay
    tabBar: '#FFFFFF',
    tabBarBorder: 'rgba(15, 23, 42, 0.05)',
    shimmer: '#E2E8F0',
    glow: 'rgba(45, 106, 79, 0.08)',
    divider: 'rgba(15, 23, 42, 0.06)',
  },

  // Dark mode — Clean Premium (Solid colors)
  dark: {
    background: '#0B1120', // Super deep dark blue
    surface: '#1E293B',
    surfaceElevated: '#334155',
    surface2: '#1E293B',
    surface3: '#334155',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    border: 'rgba(255, 255, 255, 0.08)', // Barely visible borders
    borderLight: 'rgba(255, 255, 255, 0.03)',
    card: '#1E293B',
    cardGlass: '#1E293B', // Solid dark
    overlay: 'rgba(11, 17, 32, 0.7)',
    tabBar: '#0B1120',
    tabBarBorder: 'rgba(255, 255, 255, 0.05)',
    shimmer: '#334155',
    glow: 'rgba(116, 198, 157, 0.12)',
    divider: 'rgba(255, 255, 255, 0.06)',
  },
};

export const gradients = {
  primary: [forestGreen, mintGreen],
  primaryDark: [darkForest, forestGreen],
  accent: [mintGreen, softMint],
  success: ['#2D6A4F', '#74C69D'],
  warning: ['#F59E0B', '#FBBF24'],
  error: ['#DC2626', '#EF4444'],
  dark: ['#0F172A', '#1E293B'],
  card: ['#FFFFFF', '#F8F9FA'],
  hero: [forestGreen, darkForest],
  sunset: ['#EA580C', '#F59E0B'],
  glass: ['#FFFFFF', '#FFFFFF'], // No glass effects
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 56,
};

export const borderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const typography = {
  h1: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 32,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  h2: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 24,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  h3: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 20,
    lineHeight: 28,
  },
  body: {
    fontFamily: 'Tajawal_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyBold: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: 'Tajawal_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  small: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  number: {
    fontFamily: 'Tajawal_800ExtraBold',
    fontSize: 28,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 6,
  },
  glow: {
    shadowColor: forestGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  accentGlow: {
    shadowColor: mintGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const animation = {
  fast: 120,
  normal: 250,
  slow: 400,
  spring: {
    friction: 8,
    tension: 65,
  },
  springBouncy: {
    friction: 6,
    tension: 80,
  },
};

export const iconSizes = {
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
};
