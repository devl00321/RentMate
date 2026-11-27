/**
 * Pure negotiation chat validation, rate limiting, and offer acceptance logic (M6).
 */
import { BOOKING_STATUS, FIELD_LIMITS } from '../config/constants.js';
import { canTransition } from './bookingMachine.js';
import { countDays, enumerateStayDates } from './dates.js';
import { calculateBookingPricing } from './pricing.js';

/**
 * Validate a chat text message.
 * @param {string} text
 * @returns {{ ok: boolean, text: string, reason?: string }}
 */
export function validateChatText(text) {
  const clean = String(text || '').trim();
  if (!clean) return { ok: false, text: '', reason: 'Enter a message before sending.' };
  if (clean.length > FIELD_LIMITS.MESSAGE_MAX) {
    return {
      ok: false,
      text: clean,
      reason: `Message exceeds ${FIELD_LIMITS.MESSAGE_MAX} characters (${clean.length}/${FIELD_LIMITS.MESSAGE_MAX}).`,
    };
  }
  return { ok: true, text: clean };
}

/**
 * Validate counter-offer terms (`dailyPaise`, `depositPaise`, `pickupTime`).
 * @param {{ dailyPaise: number, depositPaise: number, pickupTime: string }} offer
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateOffer(offer) {
  if (!offer || !Number.isInteger(offer.dailyPaise) || offer.dailyPaise < 100) {
    return { ok: false, reason: 'Offer daily price must be at least ₹1.' };
  }
  if (!Number.isInteger(offer.depositPaise) || offer.depositPaise < 0) {
    return { ok: false, reason: 'Offer deposit cannot be negative.' };
  }
  const time = String(offer.pickupTime || '').trim();
  if (!time || time.length > 20) {
    return { ok: false, reason: 'Specify a pickup time (up to 20 characters).' };
  }
  return { ok: true };
}

/**
 * Create an injectable-clock client rate limiter for chat messages (M6.5).
 * @param {{ minIntervalMs?: number, maxPerMinute?: number }} [opts]
 */
export function createMessageRateLimiter({ minIntervalMs = 1500, maxPerMinute = 12 } = {}) {
  /** @type {Map<string, number[]>} */
  const history = new Map();

  /**
   * Check and record a send attempt for `uid` at `nowMs`.
   * @param {string} uid
   * @param {number} [nowMs]
   * @returns {{ ok: boolean, reason?: string }}
   */
  function checkAndRecord(uid, nowMs = Date.now()) {
    const prev = (history.get(uid) || []).filter((t) => nowMs - t < 60000);
    const last = prev[prev.length - 1];
    if (last !== undefined && nowMs - last < minIntervalMs) {
      return { ok: false, reason: 'Sending too fast. Wait a moment before sending again.' };
    }
    if (prev.length >= maxPerMinute) {
      return { ok: false, reason: 'Message rate limit reached (12 per minute). Wait a moment.' };
    }
    prev.push(nowMs);
    history.set(uid, prev);
    return { ok: true };
  }

  return { checkAndRecord };
}

/**
 * Plan atomic updates when accepting a counter-offer in chat (freezes terms at Accepted).
 * @param {object} input
 * @param {any} input.booking
 * @param {{ dailyPaise: number, depositPaise: number, pickupTime: string }} input.offer
 * @param {'owner' | 'renter'} input.offerSenderRole
 * @param {'owner' | 'renter'} input.actor
 * @param {string} input.actorUid
 * @param {boolean} input.datesFree
 */
export function planAcceptOffer({
  booking,
  offer,
  offerSenderRole,
  actor,
  actorUid,
  datesFree,
}) {
  const offerCheck = validateOffer(offer);
  if (!offerCheck.ok) return { ok: false, reason: offerCheck.reason };

  const statusCheck = canTransition(booking.status, BOOKING_STATUS.ACCEPTED, actor, {
    latestOfferBy: offerSenderRole,
    datesFree,
  });
  if (!statusCheck.ok) return { ok: false, reason: statusCheck.reason };

  const days = countDays(booking.startDate, booking.endDate);
  const lockDays = enumerateStayDates(booking.startDate, booking.endDate);
  if (days < 1 || lockDays.length === 0) {
    return { ok: false, reason: 'Invalid booking date range.' };
  }

  const terms = {
    dailyPaise: offer.dailyPaise,
    depositPaise: offer.depositPaise,
    pickupTime: String(offer.pickupTime).trim(),
  };
  const amounts = calculateBookingPricing({
    dailyPaise: terms.dailyPaise,
    depositPaise: terms.depositPaise,
    days,
  });

  return {
    ok: true,
    lockDays,
    bookingPatch: {
      status: BOOKING_STATUS.ACCEPTED,
      lastActiveStatus: BOOKING_STATUS.ACCEPTED,
      terms,
      amounts,
    },
    event: {
      actorId: actorUid,
      from: booking.status,
      to: BOOKING_STATUS.ACCEPTED,
      note: `Accepted offer (₹${Math.round(terms.dailyPaise / 100)}/day, pickup ${terms.pickupTime})`,
    },
    systemMessage: {
      senderId: actorUid,
      type: 'system',
      text: `Offer accepted: ₹${Math.round(terms.dailyPaise / 100)}/day, deposit ₹${Math.round(terms.depositPaise / 100)}, pickup ${terms.pickupTime}. Terms are now frozen.`,
    },
  };
}
