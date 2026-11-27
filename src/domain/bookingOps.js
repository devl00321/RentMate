/**
 * Pure booking request builder and batch lock/event planners (M5.4 & M5.5).
 */
import { BOOKING_STATUS, DEPOSIT_STATE } from '../config/constants.js';
import { canTransition } from './bookingMachine.js';
import { enumerateStayDates, getTodayDateStr, validateStayRange } from './dates.js';
import { calculateBookingPricing } from './pricing.js';

/**
 * Resolve caller's role relative to a booking document.
 * @param {{ ownerId: string, renterId: string }} booking
 * @param {string} uid
 * @param {boolean} [isAdmin]
 * @returns {'owner' | 'renter' | 'admin' | null}
 */
export function resolveBookingActor(booking, uid, isAdmin = false) {
  if (!uid) return null;
  if (booking.ownerId === uid) return 'owner';
  if (booking.renterId === uid) return 'renter';
  if (isAdmin) return 'admin';
  return null;
}

/**
 * Validate and construct a new booking request + initial audit event.
 * @param {object} input
 * @param {any} input.listing
 * @param {{ uid: string, name?: string }} input.renter
 * @param {string} input.startDate
 * @param {string} input.endDate
 * @param {string} [input.pickupTime]
 * @param {string} [input.todayStr]
 */
export function buildBookingRequest({
  listing,
  renter,
  startDate,
  endDate,
  pickupTime = '10:00',
  todayStr = getTodayDateStr(),
}) {
  if (!listing?.id) return { ok: false, reason: 'Listing not found.' };
  if (!renter?.uid) return { ok: false, reason: 'Sign in to request dates.' };
  if (listing.ownerId === renter.uid) {
    return { ok: false, reason: 'You cannot book your own listing.' };
  }
  if (listing.status && listing.status !== 'active') {
    return { ok: false, reason: 'This listing is currently paused or unavailable.' };
  }

  const check = validateStayRange(startDate, endDate, listing.availability, todayStr);
  if (!check.ok) return { ok: false, reason: check.reason || 'Invalid dates.' };

  const terms = {
    dailyPaise: listing.dailyPaise,
    depositPaise: listing.depositPaise,
    pickupTime: String(pickupTime || '10:00').slice(0, 20),
  };
  const amounts = calculateBookingPricing({
    dailyPaise: terms.dailyPaise,
    depositPaise: terms.depositPaise,
    days: check.days,
  });

  const booking = {
    listingId: listing.id,
    listingTitle: listing.title,
    listingPhoto: listing.photos?.[0] || '',
    city: listing.city || '',
    ownerId: listing.ownerId,
    ownerName: listing.ownerName || 'Owner',
    renterId: renter.uid,
    renterName: String(renter.name || 'Renter').trim().slice(0, 80),
    status: BOOKING_STATUS.REQUESTED,
    lastActiveStatus: BOOKING_STATUS.REQUESTED,
    startDate,
    endDate,
    terms,
    amounts,
    depositState: DEPOSIT_STATE.NONE,
    latestOfferBy: '',
    confirmations: {
      ownerHandover: false,
      renterHandover: false,
      handoverPhotoUrl: '',
      ownerReturn: false,
      renterReturn: false,
      returnPhotoUrl: '',
    },
  };

  const event = {
    actorId: renter.uid,
    from: 'New',
    to: BOOKING_STATUS.REQUESTED,
    note: `Requested ${startDate} to ${endDate} (${check.days} day${check.days === 1 ? '' : 's'})`,
  };

  return { ok: true, booking, event };
}

/**
 * Plan atomic batch operations for accepting a booking and locking `bookedDays`.
 * @param {object} input
 * @param {any} input.booking
 * @param {'owner' | 'renter'} input.actor
 * @param {string} input.actorUid
 * @param {boolean} input.datesFree
 */
export function planAcceptBooking({ booking, actor, actorUid, datesFree }) {
  const check = canTransition(booking.status, BOOKING_STATUS.ACCEPTED, actor, {
    datesFree,
    latestOfferBy: booking.latestOfferBy,
  });
  if (!check.ok) return { ok: false, reason: check.reason };

  const lockDays = enumerateStayDates(booking.startDate, booking.endDate);
  if (lockDays.length === 0) {
    return { ok: false, reason: 'Booking date range is empty or exceeds 90 days.' };
  }

  return {
    ok: true,
    lockDays,
    bookingPatch: {
      status: BOOKING_STATUS.ACCEPTED,
      lastActiveStatus: BOOKING_STATUS.ACCEPTED,
    },
    event: {
      actorId: actorUid,
      from: booking.status,
      to: BOOKING_STATUS.ACCEPTED,
      note: `Accepted terms (${lockDays.length} day lock${lockDays.length === 1 ? '' : 's'} created)`,
    },
  };
}

/**
 * Plan atomic batch operations for cancelling a booking and freeing any `bookedDays` locks.
 * @param {object} input
 * @param {any} input.booking
 * @param {'owner' | 'renter'} input.actor
 * @param {string} input.actorUid
 * @param {string} [input.reason]
 */
export function planCancelBooking({ booking, actor, actorUid, reason = '' }) {
  const check = canTransition(booking.status, BOOKING_STATUS.CANCELLED, actor, {});
  if (!check.ok) return { ok: false, reason: check.reason };

  const hadLocks =
    booking.status === BOOKING_STATUS.ACCEPTED || booking.status === BOOKING_STATUS.PAID;
  const unlockDays = hadLocks ? enumerateStayDates(booking.startDate, booking.endDate) : [];
  const nextDepositState =
    booking.status === BOOKING_STATUS.PAID ? DEPOSIT_STATE.RELEASED : booking.depositState;

  return {
    ok: true,
    unlockDays,
    bookingPatch: {
      status: BOOKING_STATUS.CANCELLED,
      lastActiveStatus: booking.status,
      depositState: nextDepositState || DEPOSIT_STATE.NONE,
    },
    event: {
      actorId: actorUid,
      from: booking.status,
      to: BOOKING_STATUS.CANCELLED,
      note: String(reason || '').trim() || 'Booking cancelled',
    },
  };
}
