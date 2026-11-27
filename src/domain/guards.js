/**
 * Pure route guard helpers (rules/01 s1, M2.6).
 * One RentMate account acts as both owner and renter.
 */
import { USER_ROLE } from '../config/constants.js';

/**
 * Ensure post-auth redirect stays within internal SPA routes (no open redirect).
 * @param {string | undefined | null} rawNext
 * @returns {string}
 */
export function sanitizeNextPath(rawNext) {
  if (!rawNext || typeof rawNext !== 'string') return '/';
  const trimmed = rawNext.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes(':')) {
    return '/';
  }
  return trimmed;
}

/**
 * Guard requiring a signed-in account (both renting and lending allowed).
 * @param {{ user: { uid: string } | null, path: string }} ctx
 * @returns {string | null} Redirect path or null when allowed
 */
export function requireAuth(ctx) {
  if (!ctx?.user?.uid) {
    const target = sanitizeNextPath(ctx?.path || '/');
    return `/auth?next=${encodeURIComponent(target)}`;
  }
  return null;
}

/**
 * Guard requiring an admin account (D-010).
 * @param {{ user: { uid: string } | null, profile?: { role?: string } | null, path: string }} ctx
 * @returns {string | null}
 */
export function requireAdmin(ctx) {
  const authRedirect = requireAuth(ctx);
  if (authRedirect) return authRedirect;
  if (ctx?.profile?.role !== USER_ROLE.ADMIN) {
    return '/';
  }
  return null;
}

/**
 * Check whether a signed-in user can act as both owner and renter.
 * @param {{ uid?: string } | null | undefined} user
 * @returns {boolean}
 */
export function canActInBothRoles(user) {
  return Boolean(user && typeof user.uid === 'string' && user.uid.length > 0);
}
