// ============================================
// Runtime App Configuration — White-Label SaaS
// ============================================
// All branding, backend, currency, and feature config flows from here.
// Never hardcode app name, colors, or Supabase credentials elsewhere.

import Constants from 'expo-constants';

// Safe extraction of manifest - even if Constants is weirdly shaped
const rawConfig = Constants?.expoConfig || Constants?.manifest2?.extra?.expoConfig || Constants?.manifest || {};
const extraState = rawConfig?.extra || Constants?.manifest2?.extra || Constants?.manifest?.extra || {};
const customerConfig = extraState?.customerConfig || rawConfig?.customerConfig || {};

if (__DEV__) {
  console.log('DEBUG: Configuration Source Check:', {
    hasExpoConfig: !!Constants?.expoConfig,
    hasManifest2: !!Constants?.manifest2,
    hasExtra: !!extraState,
    hasCustomerConfig: !!customerConfig?.cloudName || !!customerConfig?.cloudinary
  });
  console.log('DEBUG: Cloudinary config found:', !!customerConfig.cloudinary?.cloudName);
}

if (!customerConfig.appName && !__DEV__) {
  console.warn('[AppConfig] Critical: No customer configuration found in manifest.');
}

export const appConfig = {
  // Branding
  appName: customerConfig.appName || 'App',
  appNameAr: customerConfig.appNameAr || 'التطبيق',
  slug: customerConfig.slug || 'app',
  tagline: customerConfig.tagline || '',
  domain: customerConfig.domain || 'app.com',
  logoInitial: customerConfig.theme?.logoInitial || 'A',

  // Cloudinary
  cloudinary: {
    cloudName: customerConfig.cloudinary?.cloudName || customerConfig.cloudName || 'dss8bhhbk',
    uploadPreset: customerConfig.cloudinary?.uploadPreset || customerConfig.uploadPreset || 'codfilate',
  },
  supabase: {
    url: customerConfig.supabase?.url || '',
    anonKey: customerConfig.supabase?.anonKey || '',
  },

  // Theme colors (customer brand)
  theme: {
    primaryColor: customerConfig.theme?.primaryColor || '#6C5CE7',
    primaryLightColor: customerConfig.theme?.primaryLightColor || '#A29BFE',
    primaryDarkColor: customerConfig.theme?.primaryDarkColor || '#5A4BD1',
    secondaryColor: customerConfig.theme?.secondaryColor || '#A29BFE',
    accentColor: customerConfig.theme?.accentColor || '#00CEC9',
    accentLightColor: customerConfig.theme?.accentLightColor || '#55EFC4',
    accentDarkColor: customerConfig.theme?.accentDarkColor || '#00B894',
    splashBackground: customerConfig.theme?.splashBackground || '#0A0A1A',
  },

  // Currency
  currency: {
    code: customerConfig.currency?.code || 'DZD',
    locale: customerConfig.currency?.locale || 'ar-DZ',
    symbol: customerConfig.currency?.symbol || 'دج',
    minimumFractionDigits: customerConfig.currency?.minimumFractionDigits ?? 0,
    maximumFractionDigits: customerConfig.currency?.maximumFractionDigits ?? 0,
  },

  // Locale
  locale: {
    language: customerConfig.locale?.language || 'ar',
    direction: customerConfig.locale?.direction || 'rtl',
    wilayas: customerConfig.locale?.wilayas ?? true,
  },

  // Feature flags
  features: {
    enablePayouts: customerConfig.features?.enablePayouts ?? true,
    enableReferralLinks: customerConfig.features?.enableReferralLinks ?? true,
    enableMultipleImages: customerConfig.features?.enableMultipleImages ?? true,
    enableCategories: customerConfig.features?.enableCategories ?? true,
    maxProductImages: customerConfig.features?.maxProductImages ?? 8,
    enableAdminPanel: customerConfig.features?.enableAdminPanel ?? false,
  },
  // Diagnostics
  isConfigured: !!customerConfig.supabase?.url && !!customerConfig.supabase?.anonKey,
  debugInfo: {
    hasConstants: !!Constants.expoConfig,
    hasManifest2: !!Constants.manifest2,
    hasCustomerConfig: !!customerConfig.appName,
    customerId: rawConfig.extra?.customerId || 'unknown',
  }
};
