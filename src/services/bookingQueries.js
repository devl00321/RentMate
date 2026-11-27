/**
 * Purpose: Read, list (limit 12), and single-doc real-time watch queries for bookings.
 * Collections touched: bookings/{id}, bookings/{id}/events/{id}, listings/{id}/bookedDays/{day}.
 * Quota note: max 12 bookings per dashboard query; single booking listener detached on route change.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { PAGE_SIZE } from '../config/constants.js';
import { AppError, ERROR_CODES } from '../config/errors.js';
import { initFirebase, trackRead } from '../config/firebase.js';

/**
 * Map Firestore booking errors into AppError.
 * @param {unknown} err
 * @param {string} fallback
 * @returns {AppError}
 */
export function mapBookingError(err, fallback) {
  if (err instanceof AppError) return err;
  const code = /** @type {{ code?: string }} */ (err)?.code || '';
  if (code === 'permission-denied') {
    return new AppError(ERROR_CODES.AUTH_FORBIDDEN, 'Action not allowed or dates already locked.', err);
  }
  if (code === 'unavailable') {
    return new AppError(ERROR_CODES.NETWORK_OFFLINE, 'Network unavailable. Check connection and retry.', err);
  }
  return new AppError(ERROR_CODES.UNKNOWN, fallback, err);
}

/**
 * Fetch up to 180 locked YYYY-MM-DD days for a listing.
 * @param {string} listingId
 * @returns {Promise<string[]>}
 */
export async function getBookedDaysForListing(listingId) {
  try {
    const { db } = await initFirebase();
    const q = query(collection(db, 'listings', listingId, 'bookedDays'), limit(180));
    const snap = await getDocs(q);
    trackRead(Math.max(1, snap.size), 'bookings.getBookedDays');
    return snap.docs.map((d) => d.id);
  } catch (err) {
    throw mapBookingError(err, 'Could not load availability calendar.');
  }
}

/**
 * Fetch a single booking document by ID.
 * @param {string} bookingId
 */
export async function getBooking(bookingId) {
  try {
    const { db } = await initFirebase();
    const snap = await getDoc(doc(db, 'bookings', bookingId));
    trackRead(1, 'bookings.getBooking');
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    throw mapBookingError(err, 'Could not load booking.');
  }
}

/**
 * Subscribe to a single booking document (detach returned function on route leave!).
 * @param {string} bookingId
 * @param {(booking: any | null) => void} onData
 * @param {(err: AppError) => void} [onError]
 * @returns {Promise<() => void>}
 */
export async function watchBooking(bookingId, onData, onError) {
  const { db } = await initFirebase();
  return onSnapshot(
    doc(db, 'bookings', bookingId),
    (snap) => {
      trackRead(1, 'bookings.watchDoc');
      onData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    },
    (err) => onError?.(mapBookingError(err, 'Could not sync booking updates.')),
  );
}

/**
 * Fetch up to `limit(12)` bookings where user is renter or owner.
 * @param {string} uid
 * @param {'renter' | 'owner'} roleField
 */
export async function listMyBookings(uid, roleField) {
  const field = roleField === 'owner' ? 'ownerId' : 'renterId';
  try {
    const { db } = await initFirebase();
    const q = query(
      collection(db, 'bookings'),
      where(field, '==', uid),
      orderBy('updatedAt', 'desc'),
      limit(PAGE_SIZE),
    );
    const snap = await getDocs(q);
    trackRead(Math.max(1, snap.size), `bookings.list:${roleField}`);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    throw mapBookingError(err, 'Could not load bookings.');
  }
}

/**
 * Fetch up to 50 audit events for a booking.
 * @param {string} bookingId
 */
export async function listBookingEvents(bookingId) {
  try {
    const { db } = await initFirebase();
    const q = query(
      collection(db, 'bookings', bookingId, 'events'),
      orderBy('createdAt', 'asc'),
      limit(50),
    );
    const snap = await getDocs(q);
    trackRead(Math.max(1, snap.size), 'bookings.listEvents');
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    throw mapBookingError(err, 'Could not load booking history.');
  }
}
