/**
 * Purpose: Firebase Phone OTP authentication via invisible reCAPTCHA (SDK 13.4.0).
 * Collections touched: none (Auth only).
 * Quota note: Firebase Phone Auth test numbers incur 0 SMS cost; real SMS uses Blaze quota.
 */
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import { initFirebase } from '../config/firebase.js';
import { mapAuthError } from './auth.js';

let recaptchaVerifier = null;

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
