/**
 * Pure two-way review validation, deterministic IDs, and reputation math (M8.4, M8.5).
 */
import { BOOKING_STATUS, FIELD_LIMITS } from '../config/constants.js';

/**
 * Deterministic review ID preventing duplicate reviews per party per booking.
 * @param {string} bookingId
 * @param {string} authorId
 * @returns {string}
 */
export function buildReviewId(bookingId, authorId) {
  return `${String(bookingId).trim()}_${String(authorId).trim()}`;
}

/**
 * Resolve who is being reviewed by `authorUid` on a booking (returns null if unauthorized).
 * @param {{ ownerId: string, renterId: string }} booking
 * @param {string} authorUid
 * @returns {string | null}
 */
export function resolveReviewSubject(booking, authorUid) {
  if (!booking || !authorUid) return null;
  if (booking.ownerId === authorUid) return booking.renterId;
  if (booking.renterId === authorUid) return booking.ownerId;
  return null;
}

/**
 * Validate review rating (1..5 integer) and text length (1..600).
 * @param {{ rating: number, text: string }} input
 * @returns {{ ok: boolean, rating: number, text: string, reason?: string }}
 */
export function validateReviewInput({ rating, text }) {
  const num = Number(rating);
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    return { ok: false, rating: 0, text: '', reason: 'Choose a rating from 1 to 5 stars.' };
  }
  const cleanText = String(text || '').trim();
  if (!cleanText || cleanText.length > FIELD_LIMITS.REVIEW_MAX) {
    return {
      ok: false,
      rating: num,
      text: cleanText,
      reason: `Review must be 1 to ${FIELD_LIMITS.REVIEW_MAX} characters.`,
    };
  }
  return { ok: true, rating: num, text: cleanText };
}

/**
 * Compute updated reputation score when a new rating arrives.
 * @param {{ currentAvg: number, currentCount: number, newRating: number }} input
 * @returns {{ ratingAvg: number, ratingCount: number }}
 */
export function computeUpdatedReputation({ currentAvg, currentCount, newRating }) {
  if (!Number.isInteger(newRating) || newRating < 1 || newRating > 5) {
    throw new RangeError('newRating must be integer 1..5');
  }
  if (!Number.isInteger(currentCount) || currentCount < 0) {
    throw new RangeError('currentCount must be non-negative integer');
  }
  const nextCount = currentCount + 1;
  const total = currentAvg * currentCount + newRating;
  const nextAvg = Math.round((total / nextCount) * 100) / 100;
  return { ratingAvg: nextAvg, ratingCount: nextCount };
}

/**
 * Compute `{ ratingAvg, ratingCount }` from an array of review documents.
 * @param {Array<{ rating: number }>} reviews
 * @returns {{ ratingAvg: number, ratingCount: number }}
 */
export function computeReputationFromReviews(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return { ratingAvg: 0, ratingCount: 0 };
  }
  let sum = 0;
  let count = 0;
  for (const r of reviews) {
    const val = Number(r?.rating);
    if (val >= 1 && val <= 5) {
      sum += val;
      count += 1;
    }
  }
  if (count === 0) return { ratingAvg: 0, ratingCount: 0 };
  return {
    ratingAvg: Math.round((sum / count) * 100) / 100,
    ratingCount: count,
  };
}

/**
 * Build a validated review document payload if booking is Completed.
 * @param {{ booking: any, authorUid: string, authorName?: string, rating: number, text: string }} input
 */
export function buildReviewPayload({ booking, authorUid, authorName = 'Member', rating, text }) {
  if (!booking || booking.status !== BOOKING_STATUS.COMPLETED) {
    return { ok: false, reason: 'Reviews open only after the rental is Completed.' };
  }
  const subjectId = resolveReviewSubject(booking, authorUid);
  if (!subjectId || subjectId === authorUid) {
    return { ok: false, reason: 'Only the other party on this booking can be reviewed.' };
  }
  const check = validateReviewInput({ rating, text });
  if (!check.ok) return { ok: false, reason: check.reason };

  return {
    ok: true,
    reviewId: buildReviewId(booking.id, authorUid),
    data: {
      bookingId: booking.id,
      authorId: authorUid,
      authorName: String(authorName || 'Member').trim().slice(0, 80),
      subjectId,
      rating: check.rating,
      text: check.text,
    },
  };
}
