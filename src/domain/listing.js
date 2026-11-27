/**
 * Pure listing domain helpers: money conversion, step validation, and payload builder.
 */
import { CATEGORIES, FIELD_LIMITS, LISTING_STATUS, MAX_LISTING_PHOTOS } from '../config/constants.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_PHOTO_RE = /^(https:\/\/.+|\.\/assets\/samples\/[a-z0-9-]+\.svg)$/i;

/**
 * Convert rupee input (string or number) to integer paise.
 * @param {string | number} rupees
 * @returns {number}
 */
export function rupeesToPaise(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}

/**
 * Validate availability ranges (`[{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }]`).
 * @param {Array<{ start?: string, end?: string }>} ranges
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateAvailabilityRanges(ranges) {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return { ok: false, reason: 'Add at least one available date range.' };
  }
  for (const r of ranges) {
    if (!ISO_DATE_RE.test(r?.start || '') || !ISO_DATE_RE.test(r?.end || '')) {
      return { ok: false, reason: 'Every date range needs a valid start and end date.' };
    }
    if (r.end <= r.start) {
      return { ok: false, reason: 'End date must be after start date.' };
    }
  }
  return { ok: true };
}

/**
 * Validate a single step (1..4) of the listing form.
 * @param {number} step
 * @param {any} draft
 * @returns {Record<string, string>}
 */
export function validateListingStep(step, draft) {
  /** @type {Record<string, string>} */
  const errors = {};
  if (step === 1) {
    const photos = Array.isArray(draft.photos) ? draft.photos : [];
    if (photos.length < 1) errors.photos = 'Add at least 1 item photo.';
    else if (photos.length > MAX_LISTING_PHOTOS) errors.photos = `Maximum ${MAX_LISTING_PHOTOS} photos allowed.`;
    else if (photos.some((u) => !SAFE_PHOTO_RE.test(String(u || '')))) {
      errors.photos = 'Every photo URL must start with https://.';
    }
  } else if (step === 2) {
    const title = String(draft.title || '').trim();
    const desc = String(draft.description || '').trim();
    const city = String(draft.city || '').trim();
    if (title.length < 3 || title.length > FIELD_LIMITS.TITLE_MAX) {
      errors.title = `Title must be 3 to ${FIELD_LIMITS.TITLE_MAX} characters.`;
    }
    if (!CATEGORIES.includes(draft.category)) {
      errors.category = 'Select a valid category.';
    }
    if (desc.length < 10 || desc.length > FIELD_LIMITS.DESCRIPTION_MAX) {
      errors.description = `Description must be 10 to ${FIELD_LIMITS.DESCRIPTION_MAX} characters.`;
    }
    if (city.length < 2 || city.length > 80) {
      errors.city = 'Enter your city (2 to 80 characters).';
    }
  } else if (step === 3) {
    const dailyPaise = rupeesToPaise(draft.dailyRupees);
    const depositPaise = rupeesToPaise(draft.depositRupees === '' ? 0 : draft.depositRupees);
    if (!Number.isInteger(dailyPaise) || dailyPaise < 100) {
      errors.dailyRupees = 'Daily price must be at least ₹1.';
    }
    if (!Number.isInteger(depositPaise) || depositPaise < 0) {
      errors.depositRupees = 'Security deposit cannot be negative.';
    }
  } else if (step === 4) {
    const availCheck = validateAvailabilityRanges(draft.availability);
    if (!availCheck.ok) errors.availability = availCheck.reason || 'Add valid dates.';
  }
  return errors;
}

/**
 * Validate all 4 steps and build normalized Firestore listing document payload.
 * @param {{ draft: any, owner: { uid: string, name: string, photoUrl?: string, ratingAvg?: number, ratingCount?: number, verified?: boolean } }} input
 */
export function buildListingPayload({ draft, owner }) {
  const allErrors = {
    ...validateListingStep(1, draft),
    ...validateListingStep(2, draft),
    ...validateListingStep(3, draft),
    ...validateListingStep(4, draft),
  };
  if (Object.keys(allErrors).length > 0) {
    return { ok: false, errors: allErrors };
  }

  return {
    ok: true,
    data: {
      ownerId: owner.uid,
      ownerName: String(owner.name || 'RentMate Member').trim().slice(0, 80),
      ownerPhoto: String(owner.photoUrl || ''),
      ownerRating: Number(owner.ratingAvg) || 0,
      ownerRatingCount: Number(owner.ratingCount) || 0,
      ownerVerified: Boolean(owner.verified),
      title: String(draft.title).trim(),
      description: String(draft.description).trim(),
      category: draft.category,
      photos: draft.photos.slice(0, MAX_LISTING_PHOTOS),
      dailyPaise: rupeesToPaise(draft.dailyRupees),
      depositPaise: rupeesToPaise(draft.depositRupees === '' ? 0 : draft.depositRupees),
      city: String(draft.city).trim(),
      cityLower: String(draft.city).trim().toLowerCase(),
      availability: draft.availability.map((r) => ({ start: r.start, end: r.end })),
      status: LISTING_STATUS.ACTIVE,
    },
  };
}

/**
 * Validate and build a sanitized listing update patch (ownerId and createdAt immutable).
 * @param {any} draft
 */
export function buildListingUpdatePayload(draft) {
  const allErrors = {
    ...validateListingStep(1, draft),
    ...validateListingStep(2, draft),
    ...validateListingStep(3, draft),
    ...validateListingStep(4, draft),
  };
  if (Object.keys(allErrors).length > 0) {
    return { ok: false, errors: allErrors };
  }
  return {
    ok: true,
    data: {
      title: String(draft.title).trim(),
      description: String(draft.description).trim(),
      category: draft.category,
      photos: draft.photos.slice(0, MAX_LISTING_PHOTOS),
      dailyPaise: rupeesToPaise(draft.dailyRupees),
      depositPaise: rupeesToPaise(draft.depositRupees === '' ? 0 : draft.depositRupees),
      city: String(draft.city).trim(),
      cityLower: String(draft.city).trim().toLowerCase(),
      availability: draft.availability.map((r) => ({ start: r.start, end: r.end })),
    },
  };
}

/**
 * Check if a listing status value is valid.
 * @param {string} status
 * @returns {boolean}
 */
export function isValidListingStatus(status) {
  return Object.values(LISTING_STATUS).includes(status);
}
