/**
 * Purpose: Booking request, accept (with atomic bookedDays locks), and cancel mutations.
 * Collections touched: bookings/{id}, bookings/{id}/events/{id}, listings/{id}/bookedDays/{day}.
 * Quota note: batched writes keep request/accept/cancel atomic with 2 + N_days writes.
 */
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { AppError, ERROR_CODES } from '../config/errors.js';
import { initFirebase, trackRead, trackWrite } from '../config/firebase.js';
import {
  buildBookingRequest,
  planAcceptBooking,
  planCancelBooking,
  resolveBookingActor,
} from '../domain/bookingOps.js';
import { mapBookingError } from './bookingQueries.js';

/**
 * Create a new booking request plus its initial audit event in one batch.
 * @param {{ listing: any, renter: { uid: string, name?: string }, startDate: string, endDate: string, pickupTime?: string }} input
 */
export async function createBookingRequest(input) {
  const built = buildBookingRequest(input);
  if (!built.ok) {
    throw new AppError(ERROR_CODES.VALIDATION_INVALID, built.reason || 'Invalid booking request.');
  }

  try {
    const { db } = await initFirebase();
    const conflictQ = query(
      collection(db, 'listings', input.listing.id, 'bookedDays'),
      where(documentId(), '>=', input.startDate),
      where(documentId(), '<', input.endDate),
      limit(1),
    );
    const conflictSnap = await getDocs(conflictQ);
    trackRead(1, 'bookings.checkConflictOnRequest');
    if (!conflictSnap.empty) {
      throw new AppError(ERROR_CODES.CONFLICT_DATES, 'Those dates are already booked.');
    }

    const bookingRef = doc(collection(db, 'bookings'));
    const eventRef = doc(collection(db, 'bookings', bookingRef.id, 'events'));
    const batch = writeBatch(db);
    batch.set(bookingRef, {
      ...built.booking,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(eventRef, { ...built.event, createdAt: serverTimestamp() });
    await batch.commit();
    trackWrite(2, 'bookings.createRequest');
    return { id: bookingRef.id, ...built.booking };
  } catch (err) {
    throw mapBookingError(err, 'Could not send booking request.');
  }
}

/**
 * Accept booking and create `bookedDays` locks in a single atomic batch (prevents double-booking).
 * @param {string} bookingId
 * @param {string} actorUid
 */
export async function acceptBooking(bookingId, actorUid) {
  try {
    const { db } = await initFirebase();
    const bookingRef = doc(db, 'bookings', bookingId);
    const snap = await getDoc(bookingRef);
    trackRead(1, 'bookings.acceptRead');
    if (!snap.exists()) throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found.');

    const booking = { id: snap.id, ...snap.data() };
    const actor = resolveBookingActor(booking, actorUid);
    if (actor !== 'owner' && actor !== 'renter') {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, 'Only booking parties can accept.');
    }

    const conflictSnap = await getDocs(
      query(
        collection(db, 'listings', booking.listingId, 'bookedDays'),
        where(documentId(), '>=', booking.startDate),
        where(documentId(), '<', booking.endDate),
        limit(1),
      ),
    );
    trackRead(1, 'bookings.acceptConflictCheck');

    const planned = planAcceptBooking({ booking, actor, actorUid, datesFree: conflictSnap.empty });
    if (!planned.ok) throw new AppError(ERROR_CODES.CONFLICT_DATES, planned.reason);

    const batch = writeBatch(db);
    batch.update(bookingRef, { ...planned.bookingPatch, updatedAt: serverTimestamp() });
    batch.set(doc(collection(db, 'bookings', bookingId, 'events')), {
      ...planned.event,
      createdAt: serverTimestamp(),
    });
    for (const day of planned.lockDays) {
      batch.set(doc(db, 'listings', booking.listingId, 'bookedDays', day), {
        bookingId,
        ownerId: booking.ownerId,
        renterId: booking.renterId,
      });
    }
    await batch.commit();
    trackWrite(2 + planned.lockDays.length, 'bookings.acceptBatch');
  } catch (err) {
    throw mapBookingError(err, 'Could not accept booking; dates may already be booked.');
  }
}

/**
 * Cancel booking and delete any `bookedDays` locks in a single batch.
 * @param {string} bookingId
 * @param {string} actorUid
 * @param {string} [reason]
 */
export async function cancelBooking(bookingId, actorUid, reason = '') {
  try {
    const { db } = await initFirebase();
    const bookingRef = doc(db, 'bookings', bookingId);
    const snap = await getDoc(bookingRef);
    trackRead(1, 'bookings.cancelRead');
    if (!snap.exists()) throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found.');

    const booking = { id: snap.id, ...snap.data() };
    const actor = resolveBookingActor(booking, actorUid);
    if (actor !== 'owner' && actor !== 'renter') {
      throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, 'Only booking parties can cancel.');
    }

    const planned = planCancelBooking({ booking, actor, actorUid, reason });
    if (!planned.ok) throw new AppError(ERROR_CODES.ILLEGAL_TRANSITION, planned.reason);

    const batch = writeBatch(db);
    batch.update(bookingRef, { ...planned.bookingPatch, updatedAt: serverTimestamp() });
    batch.set(doc(collection(db, 'bookings', bookingId, 'events')), {
      ...planned.event,
      createdAt: serverTimestamp(),
    });
    for (const day of planned.unlockDays) {
      batch.delete(doc(db, 'listings', booking.listingId, 'bookedDays', day));
    }
    await batch.commit();
    trackWrite(2 + planned.unlockDays.length, 'bookings.cancelBatch');
  } catch (err) {
    throw mapBookingError(err, 'Could not cancel booking.');
  }
}
