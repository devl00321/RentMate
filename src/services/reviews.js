/**
 * Purpose: Deterministic booking reviews (`bookingId_authorId`) and user reputation queries.
 * Collections touched: reviews/{bookingId_authorId}.
 * Quota note: 1 write per review; limit(12) for profile recent reviews.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { PAGE_SIZE } from '../config/constants.js';
import { AppError, ERROR_CODES } from '../config/errors.js';
import { initFirebase, trackRead, trackWrite } from '../config/firebase.js';
import {
  buildReviewId,
  buildReviewPayload,
  computeReputationFromReviews,
} from '../domain/reputation.js';
import { mapBookingError } from './bookingQueries.js';

/**
 * Submit a review once per party per completed booking (duplicate blocked by deterministic ID & rules).
 * @param {{ booking: any, authorUid: string, authorName?: string, rating: number, text: string }} input
 */
export async function submitBookingReview(input) {
  const built = buildReviewPayload(input);
  if (!built.ok) {
    throw new AppError(ERROR_CODES.VALIDATION_INVALID, built.reason || 'Invalid review.');
  }

  try {
    const { db } = await initFirebase();
    await setDoc(doc(db, 'reviews', built.reviewId), {
      ...built.data,
      createdAt: serverTimestamp(),
    });
    trackWrite(1, 'reviews.submit');
    return { id: built.reviewId, ...built.data };
  } catch (err) {
    const code = /** @type {{ code?: string }} */ (err)?.code || '';
    if (code === 'permission-denied') {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, 'You already reviewed this booking or cannot review yet.', err);
    }
    throw mapBookingError(err, 'Could not submit review.');
  }
}

/**
 * Fetch the current user's review for a booking, if already submitted.
 * @param {string} bookingId
 * @param {string} authorUid
 */
export async function getMyReviewForBooking(bookingId, authorUid) {
  try {
    const { db } = await initFirebase();
    const snap = await getDoc(doc(db, 'reviews', buildReviewId(bookingId, authorUid)));
    trackRead(1, 'reviews.getMine');
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch {
    return null;
  }
}

/**
 * List up to `limit(12)` recent reviews for a user and compute public reputation score.
 * @param {string} subjectId
 * @param {{ maxCount?: number }} [opts]
 */
export async function listUserReviews(subjectId, { maxCount = PAGE_SIZE } = {}) {
  try {
    const { db } = await initFirebase();
    const q = query(
      collection(db, 'reviews'),
      where('subjectId', '==', subjectId),
      orderBy('createdAt', 'desc'),
      limit(maxCount),
    );
    const snap = await getDocs(q);
    trackRead(Math.max(1, snap.size), 'reviews.listForUser');
    const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return {
      reviews,
      ...computeReputationFromReviews(reviews),
    };
  } catch (err) {
    throw mapBookingError(err, 'Could not load reviews.');
  }
}
