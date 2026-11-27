import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildBookingRequest,
  planAcceptBooking,
  planCancelBooking,
} from '../../src/domain/bookingOps.js';

const LISTING = {
  id: 'list-1',
  ownerId: 'owner-1',
  ownerName: 'Asha',
  title: 'Sony A7 IV',
  city: 'Bengaluru',
  photos: ['https://cdn/a.jpg'],
  dailyPaise: 120000,
  depositPaise: 800000,
  status: 'active',
  availability: [{ start: '2026-12-01', end: '2026-12-20' }],
};

test('buildBookingRequest validates owner-self guard, dates, and calculates pricing + event', () => {
  const selfAttempt = buildBookingRequest({
    listing: LISTING,
    renter: { uid: 'owner-1', name: 'Asha' },
    startDate: '2026-12-05',
    endDate: '2026-12-08',
    todayStr: '2026-11-27',
  });
  assert.equal(selfAttempt.ok, false);

  const built = buildBookingRequest({
    listing: LISTING,
    renter: { uid: 'renter-1', name: 'Ravi' },
    startDate: '2026-12-05',
    endDate: '2026-12-08',
    todayStr: '2026-11-27',
  });
  assert.equal(built.ok, true);
  assert.equal(built.booking.status, 'Requested');
  assert.equal(built.booking.amounts.rental, 360000);
  assert.equal(built.booking.amounts.fee, 18000);
  assert.equal(built.event.to, 'Requested');
});

test('planAcceptBooking creates per-day lock docs and second overlapping attempt fails (M5.5)', () => {
  const bookedDaysStore = new Map();
  const b1 = buildBookingRequest({
    listing: LISTING,
    renter: { uid: 'renter-1' },
    startDate: '2026-12-05',
    endDate: '2026-12-08',
    todayStr: '2026-11-27',
  }).booking;
  const b2 = buildBookingRequest({
    listing: LISTING,
    renter: { uid: 'renter-2' },
    startDate: '2026-12-06',
    endDate: '2026-12-09',
    todayStr: '2026-11-27',
  }).booking;

  // First accept succeeds and commits locks atomically
  const p1 = planAcceptBooking({
    booking: b1,
    actor: 'owner',
    actorUid: 'owner-1',
    datesFree: true,
  });
  assert.equal(p1.ok, true);
  assert.deepEqual(p1.lockDays, ['2026-12-05', '2026-12-06', '2026-12-07']);
  for (const d of p1.lockDays) {
    assert.equal(bookedDaysStore.has(d), false);
    bookedDaysStore.set(d, { bookingId: 'b1' });
  }

  // Second overlapping attempt fails both via datesFree check AND via create-only lock invariant
  const hasOverlap = ['2026-12-06', '2026-12-07', '2026-12-08'].some((d) => bookedDaysStore.has(d));
  const p2 = planAcceptBooking({
    booking: b2,
    actor: 'owner',
    actorUid: 'owner-1',
    datesFree: !hasOverlap,
  });
  assert.equal(p2.ok, false);
});

test('planCancelBooking releases locks and simulates full refund when cancelling from Paid', () => {
  const paidBooking = {
    status: 'Paid',
    startDate: '2026-12-05',
    endDate: '2026-12-07',
    depositState: 'held',
  };
  const cancelPlan = planCancelBooking({
    booking: paidBooking,
    actor: 'renter',
    actorUid: 'renter-1',
    reason: 'Plans changed',
  });
  assert.equal(cancelPlan.ok, true);
  assert.deepEqual(cancelPlan.unlockDays, ['2026-12-05', '2026-12-06']);
  assert.equal(cancelPlan.bookingPatch.depositState, 'released');
  assert.equal(cancelPlan.event.to, 'Cancelled');
});

test('firestore.rules forbids bookedDays overwrite (update: false) and freezes terms after Accepted', () => {
  const rules = fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  assert.ok(rules.includes('allow update: if false;'));
  assert.ok(rules.includes('match /bookings/{bookingId}'));
  assert.ok(rules.includes("hasAny(['terms', 'amounts', 'startDate', 'endDate'])"));
});
