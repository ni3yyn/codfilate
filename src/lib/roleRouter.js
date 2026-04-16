/**
 * roleRouter.js — Centralized Navigation & Security Utility
 * 
 * Single source of truth for:
 * 1. Role → home screen mapping (eliminates duplicated switch blocks)
 * 2. Self-registration role whitelist (SEC-1 defense-in-depth)
 * 3. Deep-link allowlist validation (SEC-3)
 */

import { ROLES } from './constants';

// ─── Role → Landing Page Mapping ────────────────────────────────────────────
export const ROLE_HOME = {
  [ROLES.DEVELOPER]:        '/(developer)/controls',
  [ROLES.ADMIN]:            '/(admin)/dashboard',
  [ROLES.MERCHANT]:         '/(merchant)/dashboard',
  [ROLES.REGIONAL_MANAGER]: '/(regional_manager)/dashboard',
  [ROLES.DELIVERY]:         '/(delivery)/deliveries',
  [ROLES.AFFILIATE]:        '/(affiliate)/dashboard',
};

// ─── Self-Registration Whitelist (SEC-1) ────────────────────────────────────
// Only these roles may be selected during self-registration.
// Admin, regional_manager, and delivery roles must be assigned by an admin.
export const SELF_REGISTRATION_ROLES = [ROLES.AFFILIATE, ROLES.MERCHANT];

// ─── Safe Navigation Helpers ────────────────────────────────────────────────

/**
 * Get the home screen path for a given role.
 * Falls back to affiliate dashboard for unknown roles.
 */
export function getHomeForRole(role) {
  return ROLE_HOME[role] || ROLE_HOME[ROLES.AFFILIATE];
}

/**
 * Centralized post-auth navigation.
 * Navigates an authenticated user to their role-appropriate home screen.
 * If no profile/role exists, redirects to login.
 */
export function navigateToRoleHome(router, profile) {
  if (!profile?.role) {
    router.replace('/(auth)/login');
    return;
  }
  router.replace(getHomeForRole(profile.role));
}

// ─── Deep-Link Allowlist (SEC-3) ────────────────────────────────────────────
// Only internal route prefixes are allowed for deep-link navigation.
const ALLOWED_DEEPLINK_PREFIXES = [
  '/(developer)/',
  '/(admin)/',
  '/(merchant)/',
  '/(affiliate)/',
  '/(regional_manager)/',
  '/(delivery)/',
  '/track/',
  '/notifications',
];

/**
 * Validates that a deep-link path is safe to navigate to.
 * Prevents open-redirect attacks via compromised notification data.
 * 
 * @param {string} path - The deep-link path to validate
 * @returns {boolean} true if the path is safe to navigate to
 */
export function isSafeDeeplink(path) {
  if (!path || typeof path !== 'string') return false;
  // Block external URLs (http:// https:// or protocol-relative //)
  if (path.includes('://') || path.startsWith('//')) return false;
  return ALLOWED_DEEPLINK_PREFIXES.some(prefix => path.startsWith(prefix));
}
