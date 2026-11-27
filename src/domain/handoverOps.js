/**
 * Pure handover, return, and simulated deposit release planners (M8.1, M8.2, M8.3).
 */
import { BOOKING_STATUS, DEPOSIT_STATE } from '../config/constants.js';
import { canTransition } from './bookingMachine.js';
import { resolveBookingActor } from './bookingOps.js';
import { enumerateStayDates } from './dates.js';

const SAFE_PHOTO_RE = /^https:\/\/.+/i;

/**
 * Plan pickup handover confirmation + condition photo (`Paid -> Handed Over` once both confirm).
 * @param {{ booking: any, actorUid: string, photoUrl?: string }} input
 */
export function planHandoverConfirmation({ booking, actorUid, photoUrl = '' }) {
  const actor = resolveBookingActor(booking, actorUid);
  if (actor !== 'owner' && actor !== 'renter') {
    return { ok: false, reason: 'Only booking parties can confirm pickup.' };
  }
  if (booking.status !== BOOKING_STATUS.PAID) {
    return { ok: false, reason: 'Pickup confirmation is only available when Paid.' };
  }

  const prev = booking.confirmations || {};
  const cleanPhoto = String(photoUrl || '').trim();
  if (cleanPhoto && !SAFE_PHOTO_RE.test(cleanPhoto)) {
    return { ok: false, reason: 'Condition photo URL must start with https://.' };
  }

  const nextPhoto = cleanPhoto || prev.handoverPhotoUrl || '';
  const nextOwner = actor === 'owner' ? true : Boolean(prev.ownerHandover);
  const nextRenter = actor === 'renter' ? true : Boolean(prev.renterHandover);

  if (actor === 'owner' && !nextPhoto) {
    return { ok: false, reason: 'Upload a pickup condition photo before confirming handover.' };
  }

  const bothConfirmed = nextOwner && nextRenter && Boolean(nextPhoto);
  if (bothConfirmed) {
    const check = canTransition(booking.status, BOOKING_STATUS.HANDED_OVER, actor, {
      bothConfirmedHandover: true,
    });
    if (!check.ok) return { ok: false, reason: check.reason };
  }

  const nextStatus = bothConfirmed ? BOOKING_STATUS.HANDED_OVER : BOOKING_STATUS.PAID;
  return {
    ok: true,
    completedStep: bothConfirmed,
    bookingPatch: {
      status: nextStatus,
      lastActiveStatus: nextStatus,
      confirmations: {
        ...prev,
        ownerHandover: nextOwner,
        renterHandover: nextRenter,
        handoverPhotoUrl: nextPhoto,
      },
    },
    event: {
      actorId: actorUid,
      from: booking.status,
      to: nextStatus,
      note: bothConfirmed
        ? 'Both sides confirmed pickup with condition photo'
        : `${actor} confirmed pickup`,
    },
  };
}

/**
 * Plan return confirmation + condition photo (`Handed Over -> Returned` once both confirm).
 * @param {{ booking: any, actorUid: string, photoUrl?: string }} input
 */
export function planReturnConfirmation({ booking, actorUid, photoUrl = '' }) {
  const actor = resolveBookingActor(booking, actorUid);
  if (actor !== 'owner' && actor !== 'renter') {
    return { ok: false, reason: 'Only booking parties can confirm return.' };
  }
  if (booking.status !== BOOKING_STATUS.HANDED_OVER) {
    return { ok: false, reason: 'Return confirmation is only available after Handed Over.' };
  }

  const prev = booking.confirmations || {};
  const cleanPhoto = String(photoUrl || '').trim();
  if (cleanPhoto && !SAFE_PHOTO_RE.test(cleanPhoto)) {
    return { ok: false, reason: 'Return photo URL must start with https://.' };
  }

  const nextPhoto = cleanPhoto || prev.returnPhotoUrl || '';
  const nextOwner = actor === 'owner' ? true : Boolean(prev.ownerReturn);
  const nextRenter = actor === 'renter' ? true : Boolean(prev.renterReturn);

  if (actor === 'renter' && !nextPhoto) {
    return { ok: false, reason: 'Upload a return condition photo before confirming return.' };
  }

  const bothConfirmed = nextOwner && nextRenter && Boolean(nextPhoto);
  if (bothConfirmed) {
    const check = canTransition(booking.status, BOOKING_STATUS.RETURNED, actor, {
      bothConfirmedReturn: true,
    });
    if (!check.ok) return { ok: false, reason: check.reason };
  }

  const nextStatus = bothConfirmed ? BOOKING_STATUS.RETURNED : BOOKING_STATUS.HANDED_OVER;
  return {
    ok: true,
    completedStep: bothConfirmed,
    bookingPatch: {
      status: nextStatus,
      lastActiveStatus: nextStatus,
      confirmations: {
        ...prev,
        ownerReturn: nextOwner,
        renterReturn: nextRenter,
        returnPhotoUrl: nextPhoto,
      },
    },
    event: {
      actorId: actorUid,
      from: booking.status,
      to: nextStatus,
      note: bothConfirmed
        ? 'Both sides confirmed return with condition photo'
        : `${actor} confirmed return`,
    },
  };
}

/**
 * Plan owner deposit release + completion + freeing `bookedDays` locks (`Returned -> Completed`).
 * @param {{ booking: any, actorUid: string, refundId: string }} input
 */
export function planCompleteAndReleaseDeposit({ booking, actorUid, refundId }) {
  const actor = resolveBookingActor(booking, actorUid);
  const check = canTransition(booking.status, BOOKING_STATUS.COMPLETED, actor || 'renter', {});
  if (!check.ok) return { ok: false, reason: check.reason };

  const unlockDays = enumerateStayDates(booking.startDate, booking.endDate);
  const depositPaise = booking.amounts?.deposit || 0;

  return {
    ok: true,
    unlockDays,
    bookingPatch: {
      status: BOOKING_STATUS.COMPLETED,
      lastActiveStatus: BOOKING_STATUS.COMPLETED,
      depositState: DEPOSIT_STATE.RELEASED,
      refundRef: refundId,
    },
    event: {
      actorId: actorUid,
      from: BOOKING_STATUS.RETURNED,
      to: BOOKING_STATUS.COMPLETED,
      note: `Owner released deposit in test mode (${refundId}); ${unlockDays.length} day lock(s) freed`,
    },
    systemMessage: {
      senderId: actorUid,
      type: 'system',
      text: `Rental completed. Security deposit of ₹${Math.round(depositPaise / 100)} released in test mode (${refundId}).`,
    },
  };
}
