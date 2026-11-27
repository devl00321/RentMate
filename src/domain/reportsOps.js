/**
 * Pure report, dispute, and admin resolution planners (M9.1-M9.5).
 */
import { BOOKING_STATUS, DEPOSIT_STATE, FIELD_LIMITS, LISTING_STATUS } from '../config/constants.js';
import { canTransition } from './bookingMachine.js';
import { resolveBookingActor } from './bookingOps.js';
import { enumerateStayDates } from './dates.js';

/**
 * Validate a report/dispute reason or admin decision note.
 * @param {string} text
 * @param {number} [minLen]
 * @returns {{ ok: boolean, text: string, reason?: string }}
 */
export function validateModerationText(text, minLen = 5) {
  const clean = String(text || '').trim();
  if (clean.length < minLen || clean.length > FIELD_LIMITS.REASON_MAX) {
    return {
      ok: false,
      text: clean,
      reason: `Enter between ${minLen} and ${FIELD_LIMITS.REASON_MAX} characters.`,
    };
  }
  return { ok: true, text: clean };
}

/**
 * Build a listing report payload.
 * @param {{ listing: any, reporterUid: string, reason: string }} input
 */
export function buildListingReport({ listing, reporterUid, reason }) {
  if (!listing?.id) return { ok: false, reason: 'Listing not found.' };
  if (!reporterUid) return { ok: false, reason: 'Sign in to report a listing.' };
  const check = validateModerationText(reason, 5);
  if (!check.ok) return { ok: false, reason: check.reason };

  return {
    ok: true,
    data: {
      reporterId: reporterUid,
      kind: 'listing',
      listingId: listing.id,
      listingTitle: listing.title || 'Listing',
      ownerId: listing.ownerId || '',
      reason: check.text,
      status: 'open',
    },
  };
}

/**
 * Build atomic booking dispute transition + report + audit event + system message.
 * @param {{ booking: any, reporterUid: string, reason: string }} input
 */
export function buildBookingDispute({ booking, reporterUid, reason }) {
  const actor = resolveBookingActor(booking, reporterUid);
  if (actor !== 'owner' && actor !== 'renter') {
    return { ok: false, reason: 'Only booking parties can open a dispute.' };
  }
  const checkText = validateModerationText(reason, 5);
  if (!checkText.ok) return { ok: false, reason: checkText.reason };

  const statusCheck = canTransition(booking.status, BOOKING_STATUS.DISPUTED, actor, {
    reason: checkText.text,
  });
  if (!statusCheck.ok) return { ok: false, reason: statusCheck.reason };

  return {
    ok: true,
    bookingPatch: {
      status: BOOKING_STATUS.DISPUTED,
      lastActiveStatus: booking.status,
    },
    report: {
      reporterId: reporterUid,
      kind: 'dispute',
      bookingId: booking.id,
      listingId: booking.listingId || '',
      listingTitle: booking.listingTitle || 'Booking',
      reason: checkText.text,
      status: 'open',
    },
    event: {
      actorId: reporterUid,
      from: booking.status,
      to: BOOKING_STATUS.DISPUTED,
      note: `Dispute opened: ${checkText.text}`,
    },
    systemMessage: {
      senderId: reporterUid,
      type: 'system',
      text: `Dispute opened (${actor}): ${checkText.text}. Admin will review chat, photos, and timeline.`,
    },
  };
}

/**
 * Plan admin resolution of a Disputed booking (`release` | `forfeit` | `cancel`).
 * @param {{ report: any, booking: any, adminUid: string, isAdmin: boolean, action: 'release' | 'forfeit' | 'cancel', note: string }} input
 */
export function planAdminDisputeDecision({
  report,
  booking,
  adminUid,
  isAdmin,
  action,
  note,
}) {
  if (!isAdmin || !adminUid) {
    return { ok: false, reason: 'Only administrators can resolve disputes.' };
  }
  const checkNote = validateModerationText(note, 5);
  if (!checkNote.ok) return { ok: false, reason: `Decision note required (${checkNote.reason}).` };

  if (!['release', 'forfeit', 'cancel'].includes(action)) {
    return { ok: false, reason: 'Invalid dispute decision action.' };
  }

  const targetStatus = action === 'cancel' ? BOOKING_STATUS.CANCELLED : BOOKING_STATUS.COMPLETED;
  const statusCheck = canTransition(booking.status, targetStatus, 'admin', { note: checkNote.text });
  if (!statusCheck.ok) return { ok: false, reason: statusCheck.reason };

  const depositState = action === 'forfeit' ? DEPOSIT_STATE.FORFEITED : DEPOSIT_STATE.RELEASED;
  const unlockDays = enumerateStayDates(booking.startDate, booking.endDate);

  return {
    ok: true,
    unlockDays,
    needsDepositRefund: action !== 'forfeit',
    bookingPatch: {
      status: targetStatus,
      lastActiveStatus: targetStatus,
      depositState,
    },
    reportPatch: {
      status: 'resolved',
      decision: {
        action,
        note: checkNote.text,
        resolvedBy: adminUid,
      },
    },
    event: {
      actorId: adminUid,
      from: BOOKING_STATUS.DISPUTED,
      to: targetStatus,
      note: `Admin (${action}): ${checkNote.text}`,
    },
    systemMessage: {
      senderId: adminUid,
      type: 'system',
      text: `Admin resolved dispute (${action}): ${checkNote.text}`,
    },
  };
}

/**
 * Validate admin listing moderation action (`paused` | `removed` | `dismiss`).
 * @param {{ isAdmin: boolean, action: string, note: string }} input
 */
export function planListingModeration({ isAdmin, action, note }) {
  if (!isAdmin) return { ok: false, reason: 'Only administrators can moderate listings.' };
  const checkNote = validateModerationText(note, 5);
  if (!checkNote.ok) return { ok: false, reason: `Moderation note required (${checkNote.reason}).` };
  if (![LISTING_STATUS.PAUSED, LISTING_STATUS.REMOVED, 'dismiss'].includes(action)) {
    return { ok: false, reason: 'Invalid moderation action.' };
  }
  return {
    ok: true,
    listingStatus: action === 'dismiss' ? null : action,
    note: checkNote.text,
  };
}
