/**
 * Purpose: Firebase email/password & session auth service (Firebase SDK 13.4.0).
 * Collections touched: users/{uid} (initial profile doc on email sign-up).
 * Quota note: 1 write on new sign-up; 0 reads on auth state changes.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { initFirebase, trackWrite } from '../config/firebase.js';
import { USER_ROLE } from '../config/constants.js';
import { AppError, ERROR_CODES } from '../config/errors.js';

const AUTH_ERROR_MESSAGES = Object.freeze({
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account already exists with this email. Sign in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/user-not-found': 'No account matches these credentials.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-phone-number': 'Enter a valid phone number in +country format.',
  'auth/missing-phone-number': 'Enter your phone number.',
  'auth/invalid-verification-code': 'The 6-digit code is incorrect. Check and try again.',
  'auth/code-expired': 'That verification code expired. Request a new one.',
  'auth/captcha-check-failed': 'reCAPTCHA check failed. Refresh and try again.',
  'auth/billing-not-enabled': 'Real SMS requires Firebase Blaze billing; use a Console test number.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Network unavailable. Check your connection and retry.',
});

/**
 * Map a Firebase Auth error into a user-facing AppError.
 * @param {unknown} err
 * @param {string} [fallback]
 * @returns {AppError}
 */
export function mapAuthError(err, fallback = 'Authentication failed. Try again.') {
  if (err instanceof AppError) return err;
  const code = /** @type {{ code?: string }} */ (err)?.code || '';
  const msg = AUTH_ERROR_MESSAGES[code] || fallback;
  const appCode = code === 'auth/network-request-failed'
    ? ERROR_CODES.NETWORK_OFFLINE
    : ERROR_CODES.AUTH_FAILED;
  return new AppError(appCode, msg, err);
}

/**
 * Normalize Firebase User into plain lightweight object.
 * @param {any} fbUser
 */
function toAuthUser(fbUser) {
  if (!fbUser) return null;
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    name: fbUser.displayName,
    phoneNumber: fbUser.phoneNumber,
  };
}

/**
 * Register a new user with email and password and create initial user doc.
 * @param {{ email: string, password: string, name: string, city: string }} input
 */
export async function signUpWithEmail({ email, password, name, city }) {
  try {
    const { auth, db } = await initFirebase();
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const cleanName = name.trim();
    await updateProfile(cred.user, { displayName: cleanName });
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: cleanName,
      city: city.trim(),
      photoUrl: '',
      verified: false,
      role: USER_ROLE.USER,
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: serverTimestamp(),
    });
    trackWrite(1, 'auth.signUpWithEmail');
    return toAuthUser(cred.user);
  } catch (err) {
    throw mapAuthError(err, 'Could not create account.');
  }
}

/**
 * Sign in with email and password.
 * @param {{ email: string, password: string }} input
 */
export async function signInWithEmail({ email, password }) {
  try {
    const { auth } = await initFirebase();
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return toAuthUser(cred.user);
  } catch (err) {
    throw mapAuthError(err, 'Could not sign in.');
  }
}

/**
 * Send password reset email.
 * @param {string} email
 */
export async function resetPassword(email) {
  try {
    const { auth } = await initFirebase();
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err) {
    throw mapAuthError(err, 'Could not send reset email.');
  }
}

/**
 * Sign out current user.
 */
export async function signOutUser() {
  try {
    const { auth } = await initFirebase();
    await signOut(auth);
  } catch (err) {
    throw mapAuthError(err, 'Could not sign out.');
  }
}

/**
 * Subscribe to Firebase auth state changes. Returns an unsubscribe function.
 * @param {(user: ReturnType<typeof toAuthUser>) => void} callback
 * @returns {Promise<() => void>}
 */
export async function watchAuthState(callback) {
  const { auth } = await initFirebase();
  return onAuthStateChanged(auth, (fbUser) => callback(toAuthUser(fbUser)));
}

/**
 * Resolve once initial persisted auth session state is known.
 * @returns {Promise<ReturnType<typeof toAuthUser>>}
 */
export async function waitForAuthReady() {
  try {
    const { auth } = await initFirebase();
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
      return toAuthUser(auth.currentUser);
    }
    return await new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        unsub();
        resolve(toAuthUser(u));
      });
    });
  } catch {
    return null;
  }
}

/**
 * Get current signed-in user snapshot from initialized auth client.
 */
export async function getCurrentUser() {
  try {
    const { auth } = await initFirebase();
    return toAuthUser(auth.currentUser);
  } catch {
    return null;
  }
}
