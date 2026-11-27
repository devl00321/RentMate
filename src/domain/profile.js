/**
 * Pure user profile payload builders (never allows client to set role/verified/rating).
 */
import { USER_ROLE } from '../config/constants.js';

/**
 * Build initial user document payload with safe server-defaulted privilege fields.
 * @param {{ name?: string, city?: string, photoUrl?: string }} input
 */
export function buildNewProfilePayload(input) {
  return {
    name: String(input.name || 'RentMate Member').trim().slice(0, 80),
    city: String(input.city || 'Not set').trim().slice(0, 80),
    photoUrl: String(input.photoUrl || '').trim().slice(0, 500),
    verified: false,
    role: USER_ROLE.USER,
    ratingAvg: 0,
    ratingCount: 0,
  };
}

/**
 * Build sanitized profile update payload. Strips role, verified, ratingAvg, ratingCount.
 * @param {{ name?: string, city?: string, photoUrl?: string }} input
 */
export function buildProfileUpdatePayload(input) {
  return {
    name: String(input.name || '').trim().slice(0, 80),
    city: String(input.city || '').trim().slice(0, 80),
    photoUrl: String(input.photoUrl || '').trim().slice(0, 500),
  };
}
