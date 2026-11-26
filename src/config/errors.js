/**
 * Standardised application error class and error codes (rules/04 s4).
 */

/** @type {Readonly<Record<string, string>>} */
export const ERROR_CODES = Object.freeze({
  AUTH_REQUIRED: 'auth/required',
  AUTH_FORBIDDEN: 'auth/forbidden',
  AUTH_FAILED: 'auth/failed',
  VALIDATION_INVALID: 'validation/invalid',
  NOT_FOUND: 'data/not-found',
  CONFLICT_DATES: 'booking/dates-unavailable',
  ILLEGAL_TRANSITION: 'booking/illegal-transition',
  PAYMENT_FAILED: 'payment/failed',
  UPLOAD_FAILED: 'upload/failed',
  RATE_LIMITED: 'rate/limited',
  NETWORK_OFFLINE: 'network/offline',
  CONFIG_MISSING: 'config/missing',
  UNKNOWN: 'app/unknown',
});

/**
 * Structured error thrown by services and domain validators.
 */
export class AppError extends Error {
  /**
   * @param {string} code - One of ERROR_CODES.
   * @param {string} message - User-friendly error description.
   * @param {unknown} [cause] - Original error or diagnostic detail.
   */
  constructor(code, message, cause = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}
