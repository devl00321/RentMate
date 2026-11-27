import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildListingReport,
  buildBookingDispute,
  planAdminDisputeDecision,
  planListingModeration,
} from '../../src/domain/reportsOps.js';

const BOOKING = {
  id: 'bk-d1',
  listingId: 'list-1',
  listingTitle: 'Camera Kit',
  ownerId: 'owner-1',
  renterId: 'renter-1',
  status: 'Handed Over',
  startDate: '2026-12-05',
  endDate: '2026-12-07',
};

test('buildListingReport and buildBookingDispute require valid reason and actor (M9.1)', () => {
  const shortRep = buildListingReport({ listing: { id: 'l1' }, reporterUid: 'u1', reason: 'bad' });
  assert.equal(shortRep.ok, false);

  const okRep = buildListingReport({
    listing: { id: 'l1', title: 'Drone', ownerId: 'o1' },
    reporterUid: 'u1',
    reason: 'Suspected counterfeit accessory photos.',
  });
  assert.equal(okRep.ok, true);
  assert.equal(okRep.data.kind, 'listing');

  const strangerDispute = buildBookingDispute({
    booking: BOOKING,
    reporterUid: 'stranger',
    reason: 'Not my booking',
  });
  assert.equal(strangerDispute.ok, false);

  const okDispute = buildBookingDispute({
    booking: BOOKING,
    reporterUid: 'owner-1',
    reason: 'Lens returned with cracked filter.',
  });
  assert.equal(okDispute.ok, true);
  assert.equal(okDispute.bookingPatch.status, 'Disputed');
  assert.equal(okDispute.report.kind, 'dispute');
});

test('planAdminDisputeDecision enforces admin role, required note, and updates deposit/locks (M9.2, M9.4)', () => {
  const disputed = { ...BOOKING, status: 'Disputed' };
  const nonAdmin = planAdminDisputeDecision({
    report: { id: 'rep-1' },
    booking: disputed,
    adminUid: 'owner-1',
    isAdmin: false,
    action: 'forfeit',
    note: 'Give me the deposit',
  });
  assert.equal(nonAdmin.ok, false);

  const missingNote = planAdminDisputeDecision({
    report: { id: 'rep-1' },
    booking: disputed,
    adminUid: 'admin-1',
    isAdmin: true,
    action: 'release',
    note: 'ok',
  });
  assert.equal(missingNote.ok, false);

  const forfeit = planAdminDisputeDecision({
    report: { id: 'rep-1' },
    booking: disputed,
    adminUid: 'admin-1',
    isAdmin: true,
    action: 'forfeit',
    note: 'Pickup vs return photos prove crack happened during rental.',
  });
  assert.equal(forfeit.ok, true);
  assert.equal(forfeit.bookingPatch.status, 'Completed');
  assert.equal(forfeit.bookingPatch.depositState, 'forfeited');
  assert.equal(forfeit.needsDepositRefund, false);
  assert.deepEqual(forfeit.unlockDays, ['2026-12-05', '2026-12-06']);

  const cancelRefund = planAdminDisputeDecision({
    report: { id: 'rep-1' },
    booking: disputed,
    adminUid: 'admin-1',
    isAdmin: true,
    action: 'cancel',
    note: 'Item unavailable at handover; full refund to renter.',
  });
  assert.equal(cancelRefund.ok, true);
  assert.equal(cancelRefund.bookingPatch.status, 'Cancelled');
  assert.equal(cancelRefund.bookingPatch.depositState, 'released');
  assert.equal(cancelRefund.needsDepositRefund, true);
});

test('planListingModeration and firestore.rules restrict moderation to admin (M9.2, M9.5)', () => {
  assert.equal(planListingModeration({ isAdmin: false, action: 'paused', note: 'Bad item' }).ok, false);
  const pause = planListingModeration({ isAdmin: true, action: 'paused', note: 'Misleading price' });
  assert.equal(pause.ok, true);
  assert.equal(pause.listingStatus, 'paused');

  const rules = fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  assert.ok(rules.includes('match /reports/{reportId}'));
  assert.ok(rules.includes('allow update: if isAdmin()'));
});
