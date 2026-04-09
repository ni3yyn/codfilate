// ============================================
// Customer Config Validator
// ============================================
// Call validateConfig() at app startup to catch misconfigurations early.
// Only logs warnings in __DEV__, throws in production for critical issues.

import { appConfig } from './appConfig';

const REQUIRED_FIELDS = [
  'appName',
  'slug',
  'supabase.url',
  'supabase.anonKey',
];

const isValidUrl = (str) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

const isValidHexColor = (str) => /^#[0-9A-Fa-f]{6}$/.test(str);

export const validateConfig = () => {
  const errors = [];
  const warnings = [];

  // Check required fields
  REQUIRED_FIELDS.forEach((field) => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], appConfig);
    if (!value || (typeof value === 'string' && !value.trim())) {
      errors.push(`Missing required config: ${field}`);
    }
  });

  // Validate Supabase URL
  if (appConfig.supabase.url && !isValidUrl(appConfig.supabase.url)) {
    errors.push(`Invalid Supabase URL: ${appConfig.supabase.url}`);
  }

  // Validate theme colors
  const themeColors = appConfig.theme;
  Object.entries(themeColors).forEach(([key, value]) => {
    if (value && key !== 'splashBackground' && key !== 'logoInitial' && !isValidHexColor(value)) {
      warnings.push(`Invalid hex color for theme.${key}: ${value}`);
    }
  });

  // Validate currency
  if (appConfig.currency.code && appConfig.currency.code.length !== 3) {
    warnings.push(`Currency code should be 3 characters (ISO 4217): ${appConfig.currency.code}`);
  }

  // Log results
  if (__DEV__) {
    if (errors.length > 0) {
      console.error('[ConfigValidator] ERRORS:', errors);
    }
    if (warnings.length > 0) {
      console.warn('[ConfigValidator] Warnings:', warnings);
    }
    if (errors.length === 0 && warnings.length === 0) {
      console.log('[ConfigValidator] Config OK for:', appConfig.appName);
    }
  }

  // In production, throw on critical errors
  if (!__DEV__ && errors.length > 0) {
    throw new Error(`Config validation failed:\n${errors.join('\n')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
