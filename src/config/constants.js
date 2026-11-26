/**
 * Application-wide constants and domain defaults.
 * Items marked PLACEHOLDER are not specified in the Review-1 Report (see brain.md).
 */

/** @type {number} PLACEHOLDER (OQ-001): 5% platform service fee */
export const FEE_RATE = 0.05;

/** @type {string} PLACEHOLDER (OQ-010): Default timezone for date calculations */
export const TIMEZONE = 'Asia/Kolkata';

/** @type {number} Default Firestore page size for quota safety (rules/01 s4) */
export const PAGE_SIZE = 12;

/** @type {number} Real-time chat message listener limit (rules/01 s4) */
export const CHAT_MESSAGE_LIMIT = 50;

/** @type {number} Maximum photos per listing (rules/01 s5) */
export const MAX_LISTING_PHOTOS = 5;

/** @type {number} Target max long edge in pixels for client image compression */
export const IMAGE_MAX_DIMENSION = 1600;

/** @type {number} JPEG compression quality (0..1) */
export const IMAGE_JPEG_QUALITY = 0.8;

/** @type {Readonly<Record<string, number>>} Max field character lengths (rules/03 s1) */
export const FIELD_LIMITS = Object.freeze({
  TITLE_MAX: 80,
  DESCRIPTION_MAX: 1000,
  MESSAGE_MAX: 500,
  REVIEW_MAX: 600,
  REASON_MAX: 500,
});

/** @type {Readonly<Record<string, string>>} Fixed booking status order (report) */
export const BOOKING_STATUS = Object.freeze({
  REQUESTED: 'Requested',
  NEGOTIATING: 'Negotiating',
  ACCEPTED: 'Accepted',
  PAID: 'Paid',
  HANDED_OVER: 'Handed Over',
  RETURNED: 'Returned',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DISPUTED: 'Disputed',
});

/** @type {readonly string[]} Ordered lifecycle statuses for UI stepper */
export const BOOKING_STATUS_ORDER = Object.freeze([
  BOOKING_STATUS.REQUESTED,
  BOOKING_STATUS.NEGOTIATING,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.PAID,
  BOOKING_STATUS.HANDED_OVER,
  BOOKING_STATUS.RETURNED,
  BOOKING_STATUS.COMPLETED,
]);

/** @type {Readonly<Record<string, string>>} Security deposit states */
export const DEPOSIT_STATE = Object.freeze({
  NONE: 'none',
  HELD: 'held',
  RELEASED: 'released',
  FORFEITED: 'forfeited',
});

/** @type {Readonly<Record<string, string>>} User roles (D-010) */
export const USER_ROLE = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

/** @type {Readonly<Record<string, string>>} Listing visibility states */
export const LISTING_STATUS = Object.freeze({
  ACTIVE: 'active',
  PAUSED: 'paused',
  REMOVED: 'removed',
});

/** @type {readonly string[]} PLACEHOLDER (OQ-006): Starter item categories */
export const CATEGORIES = Object.freeze([
  'Cameras & Lenses',
  'Drones & Action Cams',
  'Power Tools',
  'Musical Instruments',
  'Camping & Outdoor',
  'Party & Events',
  'Sports & Fitness',
  'Audio & Projectors',
]);
