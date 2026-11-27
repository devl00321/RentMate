import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planHandoverConfirmation,
  planReturnConfirmation,
  planCompleteAndReleaseDeposit,
} from '../../src/domain/handoverOps.js';

const PAID_BOOKING = {
  id: 'bk-h1',
  listingId: 'list-1',
  ownerId: 'owner-1',
  renterId: 'renter-1',
  status: 'Paid',
  depositState: 'held',
  startDate: '2026-12-05',
  endDate: '2026-12-07',
  amounts: { deposit: 800000 },
  confirmations: {
    ownerHandover: false,
    renterHandover: false,
    handoverPhotoUrl: '',
    ownerReturn: false,
    renterReturn: false,
    returnPhotoUrl: '',
  },
};

test('planHandoverConfirmation requires condition photo and moves Paid -> Handed Over when both confirm (M8.1)', () => {
  const noPhoto = planHandoverConfirmation({ booking: PAID_BOOKING, actorUid: 'owner-1', photoUrl: '' });
  assert.equal(noPhoto.ok, false);

  const step1 = planHandoverConfirmation({
    booking: PAID_BOOKING,
    actorUid: 'owner-1',
    photoUrl: 'https://cdn/pickup.jpg',
  });
  assert.equal(step1.ok, true);
  assert.equal(step1.completedStep, false);
  assert.equal(step1.bookingPatch.status, 'Paid');

  const step2 = planHandoverConfirmation({
    booking: { ...PAID_BOOKING, confirmations: step1.bookingPatch.confirmations },
    actorUid: 'renter-1',
  });
  assert.equal(step2.ok, true);
  assert.equal(step2.completedStep, true);
  assert.equal(step2.bookingPatch.status, 'Handed Over');
});

test('planReturnConfirmation moves Handed Over -> Returned when photo and both confirmations exist (M8.2)', () => {
  const handed = { ...PAID_BOOKING, status: 'Handed Over' };
  const renterNoPhoto = planReturnConfirmation({ booking: handed, actorUid: 'renter-1', photoUrl: '' });
  assert.equal(renterNoPhoto.ok, false);

  const r1 = planReturnConfirmation({
    booking: handed,
    actorUid: 'renter-1',
    photoUrl: 'https://cdn/return.jpg',
  });
  assert.equal(r1.ok, true);
  assert.equal(r1.bookingPatch.status, 'Handed Over');

  const r2 = planReturnConfirmation({
    booking: { ...handed, confirmations: r1.bookingPatch.confirmations },
    actorUid: 'owner-1',
  });
  assert.equal(r2.ok, true);
  assert.equal(r2.bookingPatch.status, 'Returned');
});

test('planCompleteAndReleaseDeposit marks Completed, releases deposit, and frees bookedDays (M8.3)', () => {
  const returned = { ...PAID_BOOKING, status: 'Returned' };
  const renterAttempt = planCompleteAndReleaseDeposit({
    booking: returned,
    actorUid: 'renter-1',
    refundId: 'sim_ref_1',
  });
  assert.equal(renterAttempt.ok, false);

  const completed = planCompleteAndReleaseDeposit({
    booking: returned,
    actorUid: 'owner-1',
    refundId: 'sim_ref_1',
  });
  assert.equal(completed.ok, true);
  assert.equal(completed.bookingPatch.status, 'Completed');
  assert.equal(completed.bookingPatch.depositState, 'released');
  assert.deepEqual(completed.unlockDays, ['2026-12-05', '2026-12-06']);
  assert.equal(completed.systemMessage.type, 'system');
});
