/**
 * Pure input validation helpers shared by forms and services (rules/04 s5).
 */
import { FIELD_LIMITS } from '../config/constants.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_PHONE_RE = /^\+[1-9]\d{7,14}$/;

/**
 * Validate auth form input for signin, signup, or reset mode.
 * @param {'signin' | 'signup' | 'reset'} mode
 * @param {{ email?: string, password?: string, name?: string, city?: string }} vals
 * @returns {Record<string, string>}
 */
export function validateAuthInput(mode, vals) {
  /** @type {Record<string, string>} */
  const errors = {};
  const email = (vals.email || '').trim();
  if (!email || !EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (mode !== 'reset' && (!vals.password || vals.password.length < 6)) {
    errors.password = 'Enter a password of at least 6 characters.';
  }
  if (mode === 'signup') {
    const name = (vals.name || '').trim();
    const city = (vals.city || '').trim();
    if (name.length < 2 || name.length > 80) {
      errors.name = 'Enter your name (2 to 80 characters).';
    }
    if (city.length < 2 || city.length > 80) {
      errors.city = 'Enter your city (2 to 80 characters).';
    }
  }
  return errors;
}

/**
 * Validate E.164 phone number and 6-digit OTP code.
 * @param {string} phone
 * @param {string} [otp]
 * @param {boolean} [requireOtp]
 * @returns {Record<string, string>}
 */
export function validatePhoneInput(phone, otp = '', requireOtp = false) {
  /** @type {Record<string, string>} */
  const errors = {};
  const cleanPhone = (phone || '').replace(/[\s-]/g, '');
  if (!E164_PHONE_RE.test(cleanPhone)) {
    errors.phone = 'Enter phone in international format, e.g. +919876543210.';
  }
  if (requireOtp && !/^\d{6}$/.test((otp || '').trim())) {
    errors.otp = 'Enter the 6-digit verification code.';
  }
  return errors;
}

/**
 * Validate user profile fields (name, city, optional photoUrl).
 * @param {{ name?: string, city?: string, photoUrl?: string }} vals
 * @returns {Record<string, string>}
 */
export function validateProfileInput(vals) {
  /** @type {Record<string, string>} */
  const errors = {};
  const name = (vals.name || '').trim();
  const city = (vals.city || '').trim();
  const photoUrl = (vals.photoUrl || '').trim();

  if (name.length < 2 || name.length > 80) {
    errors.name = 'Name must be between 2 and 80 characters.';
  }
  if (city.length < 2 || city.length > 80) {
    errors.city = 'City must be between 2 and 80 characters.';
  }
  if (photoUrl && !/^https:\/\/.+/i.test(photoUrl)) {
    errors.photoUrl = 'Photo URL must start with https://.';
  }
  return errors;
}

/**
 * Validate listing text fields and money values (integer paise).
 * @param {object} vals
 * @returns {Record<string, string>}
 */
export function validateListingInput(vals) {
  /** @type {Record<string, string>} */
  const errors = {};
  const title = (vals.title || '').trim();
  const desc = (vals.description || '').trim();
  const city = (vals.city || '').trim();

  if (title.length < 3 || title.length > FIELD_LIMITS.TITLE_MAX) {
    errors.title = `Title must be 3 to ${FIELD_LIMITS.TITLE_MAX} characters.`;
  }
  if (desc.length < 10 || desc.length > FIELD_LIMITS.DESCRIPTION_MAX) {
    errors.description = `Description must be 10 to ${FIELD_LIMITS.DESCRIPTION_MAX} characters.`;
  }
  if (!vals.category) errors.category = 'Choose a category.';
  if (city.length < 2 || city.length > 80) errors.city = 'Enter a city name.';
  if (!Number.isInteger(vals.dailyPaise) || vals.dailyPaise < 100) {
    errors.dailyPrice = 'Daily price must be at least ₹1.';
  }
  if (!Number.isInteger(vals.depositPaise) || vals.depositPaise < 0) {
    errors.deposit = 'Deposit cannot be negative.';
  }
  return errors;
}
