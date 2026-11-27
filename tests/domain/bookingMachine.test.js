import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING_STATUS } from '../../src/config/constants.js';
import { canTransition, getAllowedTargets } from '../../src/domain/bookingMachine.js';

const S = BOOKING_STATUS;

test('canTransition permits all legal lifecycle transitions for valid actors and guards', () => {
  const legal = [
    [S.REQUESTED, S.NEGOTIATING, 'renter', { hasMessageOrOffer: true }],
    [S.REQUESTED, S.ACCEPTED, 'owner', { datesFree: true }],
    [S.NEGOTIATING, S.ACCEPTED, 'renter', { latestOfferBy: 'owner', datesFree: true }],
    [S.ACCEPTED, S.PAID, 'renter', { paymentSucceeded: true }],
    [S.PAID, S.HANDED_OVER, 'owner', { bothConfirmedHandover: true }],
    [S.HANDED_OVER, S.RETURNED, 'renter', { bothConfirmedReturn: true }],
    [S.RETURNED, S.COMPLETED, 'owner', {}],
    [S.REQUESTED, S.CANCELLED, 'renter', {}],
    [S.PAID, S.CANCELLED, 'owner', {}],
    [S.PAID, S.DISPUTED, 'renter', { reason: 'Wrong item' }],
    [S.HANDED_OVER, S.DISPUTED, 'owner', { reason: 'Damaged lens' }],
    [S.RETURNED, S.DISPUTED, 'owner', { reason: 'Missing battery' }],
    [S.DISPUTED, S.COMPLETED, 'admin', { note: 'Deposit forfeited per photos' }],
    [S.DISPUTED, S.CANCELLED, 'admin', { note: 'Full refund to renter' }],
  ];

  for (const [from, to, actor, ctx] of legal) {
    const res = canTransition(from, to, actor, ctx);
    assert.equal(res.ok, true, `Expected ${from} -> ${to} by ${actor} to pass, got: ${res.reason}`);
  }
});

test('canTransition blocks illegal jumps, wrong actors, and unmet guards', () => {
  const illegal = [
    [S.REQUESTED, S.ACCEPTED, 'renter', { datesFree: true }],
    [S.REQUESTED, S.ACCEPTED, 'owner', { datesFree: false }],
    [S.REQUESTED, S.PAID, 'renter', { paymentSucceeded: true }],
    [S.NEGOTIATING, S.ACCEPTED, 'owner', { latestOfferBy: 'owner' }],
    [S.NEGOTIATING, S.ACCEPTED, 'renter', { latestOfferBy: 'owner', offerExpired: true }],
    [S.ACCEPTED, S.PAID, 'owner', { paymentSucceeded: true }],
    [S.ACCEPTED, S.PAID, 'renter', { paymentSucceeded: false }],
    [S.PAID, S.HANDED_OVER, 'owner', { bothConfirmedHandover: false }],
    [S.HANDED_OVER, S.CANCELLED, 'renter', {}],
    [S.RETURNED, S.COMPLETED, 'renter', {}],
    [S.PAID, S.DISPUTED, 'renter', { reason: '  ' }],
    [S.DISPUTED, S.COMPLETED, 'owner', { note: 'Self resolve' }],
    [S.DISPUTED, S.COMPLETED, 'admin', { note: '' }],
    [S.COMPLETED, S.CANCELLED, 'admin', { note: 'Too late' }],
    [S.CANCELLED, S.REQUESTED, 'renter', {}],
  ];

  for (const [from, to, actor, ctx] of illegal) {
    const res = canTransition(from, to, actor, ctx);
    assert.equal(res.ok, false, `Expected ${from} -> ${to} by ${actor} to fail`);
    assert.ok(res.reason.length > 0);
  }
});

test('getAllowedTargets summarizes next steps for an actor', () => {
  assert.deepEqual(
    getAllowedTargets(S.REQUESTED, 'owner', { datesFree: true, hasMessageOrOffer: true }),
    [S.NEGOTIATING, S.ACCEPTED, S.CANCELLED],
  );
  assert.deepEqual(getAllowedTargets(S.COMPLETED, 'admin', { note: 'ok' }), []);
});
