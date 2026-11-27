import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING_STATUS, DEPOSIT_STATE } from '../../src/config/constants.js';
import { renderBookingMarkup, getPrimaryBookingAction } from '../../src/components/bookingViewMarkup.js';

test('renderBookingMarkup renders all 9 statuses with ribbon, price breakdown, and test-mode notice', () => {
  for (const status of Object.values(BOOKING_STATUS)) {
    const out = renderBookingMarkup(
      {
        id: 'bk-1',
        listingId: 'list-1',
        listingTitle: 'Mirrorless Camera',
        city: 'Bengaluru',
        startDate: '2026-12-05',
        endDate: '2026-12-07',
        status,
        depositState: status === BOOKING_STATUS.PAID ? DEPOSIT_STATE.HELD : DEPOSIT_STATE.NONE,
        terms: { dailyPaise: 120000, depositPaise: 800000, pickupTime: '10:00' },
        amounts: { rental: 240000, fee: 12000, deposit: 800000, renterPays: 1052000 },
      },
      { actor: 'renter', events: [{ from: 'New', to: 'Requested', note: 'Requested' }] },
    ).toString();

    assert.ok(out.includes(`data-booking-status="${status}"`), `Missing status ${status}`);
    assert.ok(out.includes('Test mode: no real money moves'));
    assert.ok(out.includes('₹10,520'));
  }
});

test('getPrimaryBookingAction returns exact role-specific action per status', () => {
  assert.equal(getPrimaryBookingAction({ status: BOOKING_STATUS.REQUESTED }, 'owner')?.action, 'accept');
  assert.equal(getPrimaryBookingAction({ status: BOOKING_STATUS.REQUESTED }, 'renter'), null);
  assert.equal(getPrimaryBookingAction({ status: BOOKING_STATUS.ACCEPTED }, 'renter')?.action, 'pay');
  assert.equal(getPrimaryBookingAction({ status: BOOKING_STATUS.RETURNED }, 'owner')?.action, 'release');
  assert.equal(getPrimaryBookingAction({ status: BOOKING_STATUS.COMPLETED }, 'owner'), null);
});
