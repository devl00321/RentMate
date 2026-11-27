/**
 * Pure booking status state machine and transition table (Decision D-004, rules/02 s2).
 * Terminal states: Completed, Cancelled. Disputed is resolved only by an admin.
 */
import { BOOKING_STATUS } from '../config/constants.js';

const {
  REQUESTED,
  NEGOTIATING,
  ACCEPTED,
  PAID,
  HANDED_OVER,
  RETURNED,
  COMPLETED,
  CANCELLED,
  DISPUTED,
} = BOOKING_STATUS;

const ACTIVE_PRE_HANDOVER = new Set([REQUESTED, NEGOTIATING, ACCEPTED, PAID]);
const DISPUTABLE = new Set([PAID, HANDED_OVER, RETURNED]);

/**
 * Declarative transition table matching rules/02 s2.
 * Each entry: { from: string[], to: string, actors: string[], guard: (actor, ctx) => string | null }
 */
export const TRANSITION_TABLE = Object.freeze([
  {
    from: [REQUESTED],
    to: NEGOTIATING,
    actors: ['owner', 'renter'],
    guard: (_actor, ctx) =>
      ctx.hasMessageOrOffer ? null : 'Send a message or counter-offer to begin negotiating.',
  },
  {
    from: [REQUESTED],
    to: ACCEPTED,
    actors: ['owner'],
    guard: (_actor, ctx) =>
      ctx.datesFree === true ? null : 'Selected dates are no longer available.',
  },
  {
    from: [NEGOTIATING],
    to: ACCEPTED,
    actors: ['owner', 'renter'],
    guard: (actor, ctx) => {
      if (!ctx.latestOfferBy) return 'An active offer is required before accepting.';
      if (ctx.latestOfferBy === actor) return 'The other party must accept your latest offer.';
      if (ctx.offerExpired) return 'The latest offer has expired.';
      if (ctx.datesFree === false) return 'Selected dates are no longer available.';
      return null;
    },
  },
  {
    from: [ACCEPTED],
    to: PAID,
    actors: ['renter'],
    guard: (_actor, ctx) =>
      ctx.paymentSucceeded === true ? null : 'Payment confirmation is required.',
  },
  {
    from: [PAID],
    to: HANDED_OVER,
    actors: ['owner', 'renter'],
    guard: (_actor, ctx) =>
      ctx.bothConfirmedHandover === true
        ? null
        : 'Both owner and renter must confirm pickup with a condition photo.',
  },
  {
    from: [HANDED_OVER],
    to: RETURNED,
    actors: ['owner', 'renter'],
    guard: (_actor, ctx) =>
      ctx.bothConfirmedReturn === true
        ? null
        : 'Both return confirmation and condition photo are required.',
  },
  {
    from: [RETURNED],
    to: COMPLETED,
    actors: ['owner'],
    guard: () => null,
  },
  {
    from: [...ACTIVE_PRE_HANDOVER],
    to: CANCELLED,
    actors: ['owner', 'renter'],
    guard: () => null,
  },
  {
    from: [...DISPUTABLE],
    to: DISPUTED,
    actors: ['owner', 'renter'],
    guard: (_actor, ctx) =>
      String(ctx.reason || '').trim().length > 0 ? null : 'Provide a dispute reason.',
  },
  {
    from: [DISPUTED],
    to: COMPLETED,
    actors: ['admin'],
    guard: (_actor, ctx) =>
      String(ctx.note || '').trim().length > 0 ? null : 'Admin decision note is required.',
  },
  {
    from: [DISPUTED],
    to: CANCELLED,
    actors: ['admin'],
    guard: (_actor, ctx) =>
      String(ctx.note || '').trim().length > 0 ? null : 'Admin decision note is required.',
  },
]);

/**
 * Check whether a booking status transition is permitted for `actor` under `ctx`.
 * @param {string} from
 * @param {string} to
 * @param {'owner' | 'renter' | 'admin'} actor
 * @param {Record<string, any>} [ctx]
 * @returns {{ ok: boolean, reason: string }}
 */
export function canTransition(from, to, actor, ctx = {}) {
  if (!from || !to) return { ok: false, reason: 'Missing source or target status.' };
  if (from === COMPLETED || from === CANCELLED) {
    return { ok: false, reason: `Booking is already ${from} and cannot change.` };
  }
  const rule = TRANSITION_TABLE.find((entry) => entry.from.includes(from) && entry.to === to);
  if (!rule) {
    return { ok: false, reason: `Transition from ${from} to ${to} is not allowed.` };
  }
  if (!rule.actors.includes(actor)) {
    return { ok: false, reason: `${actor} is not permitted to move booking to ${to}.` };
  }
  const guardErr = rule.guard(actor, ctx);
  if (guardErr) return { ok: false, reason: guardErr };
  return { ok: true, reason: '' };
}

/**
 * List allowed target statuses from `from` for `actor` under `ctx`.
 * @param {string} from
 * @param {'owner' | 'renter' | 'admin'} actor
 * @param {Record<string, any>} [ctx]
 * @returns {string[]}
 */
export function getAllowedTargets(from, actor, ctx = {}) {
  return Object.values(BOOKING_STATUS).filter((to) => canTransition(from, to, actor, ctx).ok);
}
