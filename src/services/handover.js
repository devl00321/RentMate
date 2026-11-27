/**
 * Purpose: Handover/return confirmation with condition photos and simulated deposit release.
 * Collections touched: bookings/{id}, bookings/{id}/events/{id}, bookings/{id}/messages/{id}, listings/{id}/bookedDays/{day}.
 * Quota note: 2-3 writes per confirmation; 3 + N_days batch writes on completion.
 */
import { collection, doc, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { AppError, ERROR_CODES } from '../config/errors.js';
import { initFirebase, trackWrite } from '../config/firebase.js';
import {
  planCompleteAndReleaseDeposit,
  planHandoverConfirmation,
  planReturnConfirmation,
} from '../domain/handoverOps.js';
import { mapBookingError } from './bookingQueries.js';
import { getPaymentProvider } from './payments.js';

/**
 * Submit handover confirmation and condition photo.
 * @param {{ booking: any, actorUid: string, photoUrl?: string }} input
 */
export async function confirmHandover({ booking, actorUid, photoUrl = '' }) {
  const planned = planHandoverConfirmation({ booking, actorUid, photoUrl });
  if (!planned.ok) {
    throw new AppError(ERROR_CODES.VALIDATION_INVALID, planned.reason || 'Cannot confirm pickup.');
  }

  try {
    const { db } = await initFirebase();
    const batch = writeBatch(db);
    batch.update(doc(db, 'bookings', booking.id), {
      ...planned.bookingPatch,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'bookings', booking.id, 'events')), {
      ...planned.event,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    trackWrite(2, 'handover.confirmPickup');
    return planned;
  } catch (err) {
    throw mapBookingError(err, 'Could not confirm pickup.');
  }
}

/**
 * Submit return confirmation and condition photo.
 * @param {{ booking: any, actorUid: string, photoUrl?: string }} input
 */
export async function confirmReturn({ booking, actorUid, photoUrl = '' }) {
  const planned = planReturnConfirmation({ booking, actorUid, photoUrl });
  if (!planned.ok) {
    throw new AppError(ERROR_CODES.VALIDATION_INVALID, planned.reason || 'Cannot confirm return.');
  }

  try {
    const { db } = await initFirebase();
    const batch = writeBatch(db);
    batch.update(doc(db, 'bookings', booking.id), {
      ...planned.bookingPatch,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'bookings', booking.id, 'events')), {
      ...planned.event,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    trackWrite(2, 'handover.confirmReturn');
    return planned;
  } catch (err) {
    throw mapBookingError(err, 'Could not confirm return.');
  }
}

/**
 * Owner confirms final return, releases deposit in test mode, marks Completed, and frees bookedDays locks.
 * @param {{ booking: any, actorUid: string }} input
 */
export async function releaseDepositAndComplete({ booking, actorUid }) {
  const provider = await getPaymentProvider();
  const refundRes = await provider.releaseDeposit({
    paymentId: booking.paymentRef || booking.id,
    amountPaise: booking.amounts?.deposit || 0,
  });
  if (!refundRes.ok) {
    throw new AppError(ERROR_CODES.PAYMENT_FAILED, 'Could not simulate deposit release.');
  }

  const planned = planCompleteAndReleaseDeposit({
    booking,
    actorUid,
    refundId: refundRes.refundId,
  });
  if (!planned.ok) {
    throw new AppError(ERROR_CODES.ILLEGAL_TRANSITION, planned.reason || 'Cannot complete booking.');
  }

  try {
    const { db } = await initFirebase();
    const batch = writeBatch(db);
    batch.update(doc(db, 'bookings', booking.id), {
      ...planned.bookingPatch,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'bookings', booking.id, 'events')), {
      ...planned.event,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'bookings', booking.id, 'messages')), {
      ...planned.systemMessage,
      createdAt: serverTimestamp(),
    });
    for (const day of planned.unlockDays) {
      batch.delete(doc(db, 'listings', booking.listingId, 'bookedDays', day));
    }
    await batch.commit();
    trackWrite(3 + planned.unlockDays.length, 'handover.releaseAndComplete');
    return refundRes;
  } catch (err) {
    throw mapBookingError(err, 'Could not release deposit.');
  }
}
