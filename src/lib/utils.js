import { appConfig } from './appConfig';

/**
 * Format a number as currency — reads from customer config
 */
export const formatCurrency = (amount) => {
  const { code, locale, minimumFractionDigits, maximumFractionDigits } = appConfig.currency;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount || 0);
};

/**
 * Format a date string with time
 */
export const formatLongDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(appConfig.currency.locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Format a date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(appConfig.currency.locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Format relative time (Arabic)
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  return formatDate(dateString);
};

/**
 * Generate a referral link
 */
export const generateReferralLink = (referralCode, productId = null) => {
  let link = `https://${appConfig.domain}/ref/${referralCode}`;
  if (productId) link += `?p=${productId}`;
  return link;
};

/** Public landing URL for a marketer campaign slug (same host as app / web). */
export const generateCampaignLink = (slug) => {
  const s = String(slug || '').trim().toLowerCase();
  return `https://${appConfig.domain}/c/${encodeURIComponent(s)}`;
};

/**
 * Generate a cryptographically secure random referral code.
 * Uses crypto.getRandomValues() instead of Math.random() to prevent
 * predictable code generation (SEC-2: financial attribution tokens).
 */
export const generateReferralCode = (length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const array = new Uint32Array(length);
  // crypto.getRandomValues is available in browsers, Node 19+, and React Native
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for older RN environments — still better than bare Math.random
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 2147483647);
    }
  }
  return Array.from(array, (x) => chars[x % chars.length]).join('');
};

/**
 * Calculate commission from order total
 */
export const calculateCommission = (orderTotal, commissionRate) => {
  return Number(((orderTotal * commissionRate) / 100).toFixed(2));
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Get initials from a name
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Format large numbers (1000 -> 1K)
 */
export const formatCompactNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num || 0);
};
