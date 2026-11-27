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
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { initFirebase, trackWrite } from '../config/firebase.js';
import { USER_ROLE } from '../config/constants.js';
import { AppError, ERROR_CODES } from '../config/errors.js';

let recaptchaVerifier = null;

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
 * Register a new user with email and password and create initial user doc.
 * @param {{ email: string, password: string, name: string, city: string }} input
 * @returns {Promise<{ uid: string, email: string | null, name: string }>}
 */
export async function signUpWithEmail({ email, password, name, city }) {
  try {
    const { auth, db } = await initFirebase();
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const cleanName = name.trim();
    const cleanCity = city.trim();

    await updateProfile(cred.user, { displayName: cleanName });
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: cleanName,
      city: cleanCity,
      photoUrl: '',
      verified: false,
      role: USER_ROLE.USER,
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: serverTimestamp(),
    });
    trackWrite(1, 'auth.signUpWithEmail');

    return { uid: cred.user.uid, email: cred.user.email, name: cleanName };
  } catch (err) {
    throw mapAuthError(err, 'Could not create account.');
  }
}

/**
 * Sign in with email and password.
 * @param {{ email: string, password: string }} input
 * @returns {Promise<{ uid: string, email: string | null, name: string | null }>}
 */
export async function signInWithEmail({ email, password }) {
  try {
    const { auth } = await initFirebase();
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      name: cred.user.displayName,
    };
  } catch (err) {
    throw mapAuthError(err, 'Could not sign in.');
  }
}

/**
 * Send password reset email.
 * @param {string} email
 * @returns {Promise<void>}
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
 * @returns {Promise<void>}
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
 * @param {(user: { uid: string, email: string | null, name: string | null, phoneNumber: string | null } | null) => void} callback
 * @returns {Promise<() => void>}
 */
export async function watchAuthState(callback) {
  const { auth } = await initFirebase();
  return onAuthStateChanged(auth, (fbUser) => {
    if (!fbUser) {
      callback(null);
      return;
    }
    callback({
      uid: fbUser.uid,
      email: fbUser.email,
      name: fbUser.displayName,
      phoneNumber: fbUser.phoneNumber,
    });
  });
}

/**
 * Send SMS OTP to an E.164 phone number using invisible reCAPTCHA.
 * @param {string} phoneNumber
 * @param {string} containerId
 * @returns {Promise<any>} Firebase ConfirmationResult
 */
export async function sendPhoneOtp(phoneNumber, containerId) {
  try {
    const { auth } = await initFirebase();
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
    return await signInWithPhoneNumber(auth, cleanPhone, recaptchaVerifier);
  } catch (err) {
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch {
        // ignore clear error
      }
      recaptchaVerifier = null;
    }
    throw mapAuthError(err, 'Could not send verification code.');
  }
}

/**
 * Confirm 6-digit phone OTP code.
 * @param {any} confirmationResult
 * @param {string} code
 * @returns {Promise<{ uid: string, phoneNumber: string | null, name: string | null }>}
 */
export async function confirmPhoneOtp(confirmationResult, code) {
  try {
    const cred = await confirmationResult.confirm(code.trim());
    return {
      uid: cred.user.uid,
      phoneNumber: cred.user.phoneNumber,
      name: cred.user.displayName,
    };
  } catch (err) {
    throw mapAuthError(err, 'Could not verify code.');
  }
}

/**
 * Get current signed-in user snapshot synchronously from initialized auth client.
 * @returns {Promise<{ uid: string, email: string | null, name: string | null } | null>}
 */
export async function getCurrentUser() {
  const { auth } = await initFirebase();
  const u = auth.currentUser;
  if (!u) return null;
  return { uid: u.uid, email: u.email, name: u.displayName };
}
