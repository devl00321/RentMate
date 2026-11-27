/**
 * Purpose: Swappable test-mode payment gateway adapter and Paid booking transition.
 * Collections touched: bookings/{id}, bookings/{id}/events/{id}, bookings/{id}/messages/{id}.
 * Quota note: 3 batch writes on payment success; 1 event write on payment failure.
 */
import { collection, doc, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { AppError, ERROR_CODES } from '../config/errors.js';
import { loadEnv } from '../config/env.js';
import { initFirebase, trackWrite } from '../config/firebase.js';
import {
  createSimulatedProvider,
  planMarkBookingPaid,
  planPaymentFailureEvent,
} from '../domain/paymentOps.js';
import { mapBookingError } from './bookingQueries.js';

/**
 * Razorpay test-mode adapter stub (requires server-side order_id on Blaze / Stretch S1).
 * @param {{ keyId: string }} opts
 */
export function createRazorpayTestProvider({ keyId }) {
  return {
    name: 'razorpay-test',
    isTestMode: true,
    async charge({ amountPaise }) {
      if (!keyId || String(keyId).startsWith('PLACEHOLDER_')) {
        return { ok: false, reason: 'Razorpay test key ID is not configured.' };
      }
      if (typeof window === 'undefined' || typeof window.Razorpay !== 'function') {
        return { ok: false, reason: 'Razorpay Checkout script not loaded; use simulated provider on Spark.' };
      }
      return {
        ok: false,
        reason: `Razorpay order creation requires server endpoint (amount ${amountPaise} paise). Use simulated test mode on Spark.`,
      };
    },
    async releaseDeposit({ paymentId, amountPaise }) {
      return createSimulatedProvider().releaseDeposit({ paymentId, amountPaise });
    },
  };
}

/**
 * Resolve active payment provider from config (defaults to SimulatedPaymentProvider).
 */
export async function getPaymentProvider() {
  const env = await loadEnv();
  if (env.payments?.provider === 'razorpay-test') {
    return createRazorpayTestProvider({ keyId: env.payments.razorpayKeyId });
  }
  return createSimulatedProvider();
}

/**
 * Process checkout payment for an Accepted booking. Leaves status Accepted on failure so user can retry.
 * @param {{ booking: any, actorUid: string, outcome?: 'success' | 'fail', providerOverride?: any }} input
 */
export async function processBookingPayment({
  booking,
  actorUid,
  outcome = 'success',
  providerOverride = null,
}) {
  const provider = providerOverride || (await getPaymentProvider());
  const amountPaise = booking?.amounts?.renterPays || 0;
  const chargeRes = await provider.charge({
    amountPaise,
    bookingId: booking.id,
    description: booking.listingTitle || 'RentMate booking',
    outcome,
  });

  try {
    const { db } = await initFirebase();
    if (!chargeRes.ok) {
      const failEvent = planPaymentFailureEvent({
        booking,
        actorUid,
        reason: chargeRes.reason || 'Payment declined',
      });
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'bookings', booking.id, 'events')), {
        ...failEvent,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      trackWrite(1, 'payments.recordFailure');
      throw new AppError(ERROR_CODES.PAYMENT_FAILED, chargeRes.reason || 'Payment failed.');
    }

    const planned = planMarkBookingPaid({ booking, actorUid, paymentResult: chargeRes });
    if (!planned.ok) {
      throw new AppError(ERROR_CODES.ILLEGAL_TRANSITION, planned.reason || 'Cannot mark booking paid.');
    }

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
    await batch.commit();
    trackWrite(3, 'payments.markPaidBatch');
    return chargeRes;
  } catch (err) {
    throw mapBookingError(err, 'Payment could not be recorded. Retry.');
  }
}
