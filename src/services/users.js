/**
 * Purpose: Read, initialize, and update public user profile documents.
 * Collections touched: users/{uid}.
 * Quota note: 1 read on profile load; 1 write on create/update (TODO M3.3: batch active listings).
 */
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { updateProfile as updateAuthProfile } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import { initFirebase, trackRead, trackWrite } from '../config/firebase.js';
import { AppError, ERROR_CODES } from '../config/errors.js';
import { buildNewProfilePayload, buildProfileUpdatePayload } from '../domain/profile.js';
import { syncOwnerListingsProfile } from './listings.js';

/**
 * Map Firestore profile snapshot into plain public object (no email/phone).
 * @param {string} uid
 * @param {Record<string, any>} data
 */
function toPublicProfile(uid, data) {
  return {
    uid,
    name: data.name || 'RentMate Member',
    city: data.city || '',
    photoUrl: data.photoUrl || '',
    verified: Boolean(data.verified),
    role: data.role || 'user',
    ratingAvg: Number(data.ratingAvg) || 0,
    ratingCount: Number(data.ratingCount) || 0,
  };
}

/**
 * Fetch a user's public profile by UID.
 * @param {string} uid
 * @returns {Promise<ReturnType<typeof toPublicProfile> | null>}
 */
export async function getUserProfile(uid) {
  try {
    const { db } = await initFirebase();
    const snap = await getDoc(doc(db, 'users', uid));
    trackRead(1, 'users.getUserProfile');
    if (!snap.exists()) return null;
    return toPublicProfile(uid, snap.data());
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERROR_CODES.NETWORK_OFFLINE, 'Could not load profile. Check connection and retry.', err);
  }
}

/**
 * Create user profile doc if missing (e.g. after first Phone OTP sign-in).
 * @param {string} uid
 * @param {{ name?: string, city?: string, photoUrl?: string }} [defaults]
 */
export async function ensureUserProfile(uid, defaults = {}) {
  const existing = await getUserProfile(uid);
  if (existing) return existing;

  try {
    const { db } = await initFirebase();
    const payload = buildNewProfilePayload(defaults);
    await setDoc(doc(db, 'users', uid), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    trackWrite(1, 'users.ensureUserProfile');
    return toPublicProfile(uid, payload);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERROR_CODES.UNKNOWN, 'Could not initialize user profile.', err);
  }
}

/**
 * Update editable profile fields (`name`, `city`, `photoUrl`). Privileged fields are stripped.
 * @param {string} uid
 * @param {{ name: string, city: string, photoUrl?: string }} input
 */
export async function updateUserProfile(uid, input) {
  try {
    const { auth, db } = await initFirebase();
    const payload = buildProfileUpdatePayload(input);
    await updateDoc(doc(db, 'users', uid), payload);
    trackWrite(1, 'users.updateUserProfile');

    if (auth.currentUser && auth.currentUser.uid === uid) {
      await updateAuthProfile(auth.currentUser, {
        displayName: payload.name,
        photoURL: payload.photoUrl || null,
      });
    }
    await syncOwnerListingsProfile(uid, payload);
    return payload;
  } catch (err) {
    if (err instanceof AppError) throw err;
    const code = /** @type {{ code?: string }} */ (err)?.code === 'permission-denied'
      ? ERROR_CODES.AUTH_FORBIDDEN
      : ERROR_CODES.UNKNOWN;
    throw new AppError(code, 'Could not save profile changes.', err);
  }
}
