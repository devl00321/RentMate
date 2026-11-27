/**
 * Pure payment transition planners & swappable provider contract (M7.2, M7.4, M7.5).
 */
import { BOOKING_STATUS, DEPOSIT_STATE } from '../config/constants.js';
import { canTransition } from './bookingMachine.js';
import { resolveBookingActor } from './bookingOps.js';

/**
 * Create the default simulated test-mode payment provider.
 * @returns {{ name: string, isTestMode: boolean, charge: (req: any) => Promise<any>, releaseDeposit: (req: any) => Promise<any> }}
 */
export function createSimulatedProvider() {
  return {
    name: 'simulated',
    isTestMode: true,
    async charge({ amountPaise, bookingId, outcome = 'success' }) {
      if (outcome === 'fail') {
        return {
          ok: false,
          code: 'TEST_CARD_DECLINED',
          reason: 'Simulated payment declined in test mode. You can retry safely.',
        };
      }
      const suffix = Math.random().toString(36).slice(2, 8);
      return {
        ok: true,
        paymentId: `sim_pay_${bookingId.slice(0, 6)}_${suffix}`,
        amountPaise,
      };
    },
    async releaseDeposit({ paymentId, amountPaise }) {
      const suffix = Math.random().toString(36).slice(2, 8);
      return {
        ok: true,
        refundId: `sim_ref_${String(paymentId || 'dep').slice(0, 8)}_${suffix}`,
        amountPaise,
      };
    },
  };
}

/**
 * Plan atomic booking update, audit event, and system message when payment succeeds.
 * @param {{ booking: any, actorUid: string, paymentResult: { ok: boolean, paymentId: string, amountPaise: number } }} input
 */
export function planMarkBookingPaid({ booking, actorUid, paymentResult }) {
  const actor = resolveBookingActor(booking, actorUid);
  if (actor !== 'renter') {
    return { ok: false, reason: 'Only the renter can pay for this booking.' };
  }
  const check = canTransition(booking.status, BOOKING_STATUS.PAID, 'renter', {
    paymentSucceeded: Boolean(paymentResult?.ok),
  });
  if (!check.ok) return { ok: false, reason: check.reason };

  const depositPaise = booking.amounts?.deposit || 0;
  return {
    ok: true,
    bookingPatch: {
      status: BOOKING_STATUS.PAID,
      lastActiveStatus: BOOKING_STATUS.PAID,
      depositState: DEPOSIT_STATE.HELD,
      paymentRef: paymentResult.paymentId,
      paidAmountPaise: paymentResult.amountPaise,
    },
    event: {
      actorId: actorUid,
      from: booking.status,
      to: BOOKING_STATUS.PAID,
      note: `Test-mode payment ${paymentResult.paymentId} succeeded; deposit held`,
    },
    systemMessage: {
      senderId: actorUid,
      type: 'system',
      text: `Payment completed in test mode (${paymentResult.paymentId}). Security deposit of ₹${Math.round(depositPaise / 100)} is now held until return.`,
    },
  };
}

/**
 * Plan audit event when a test-mode payment fails (booking remains Accepted for retry).
 * @param {{ booking: any, actorUid: string, reason: string }} input
 */
export function planPaymentFailureEvent({ booking, actorUid, reason }) {
  return {
    actorId: actorUid,
    from: booking.status,
    to: booking.status,
    note: `Test-mode payment failed: ${reason}`,
  };
}
