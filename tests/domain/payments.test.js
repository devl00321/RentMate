import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createSimulatedProvider,
  planMarkBookingPaid,
  planPaymentFailureEvent,
} from '../../src/domain/paymentOps.js';
import { renderCheckoutMarkup } from '../../src/components/checkoutModal.js';

const ACCEPTED_BOOKING = {
  id: 'bk-pay-1',
  listingTitle: 'Mirrorless Camera',
  ownerId: 'owner-1',
  renterId: 'renter-1',
  status: 'Accepted',
  depositState: 'none',
  startDate: '2026-12-05',
  endDate: '2026-12-07',
  terms: { dailyPaise: 120000, depositPaise: 800000, pickupTime: '10:00' },
  amounts: { rental: 240000, fee: 12000, deposit: 800000, renterPays: 1052000 },
};

test('SimulatedPaymentProvider supports success and failure test outcomes (M7.2, M7.5)', async () => {
  const provider = createSimulatedProvider();
  assert.equal(provider.isTestMode, true);

  const failRes = await provider.charge({ amountPaise: 1052000, bookingId: 'bk-pay-1', outcome: 'fail' });
  assert.equal(failRes.ok, false);

  const failEv = planPaymentFailureEvent({ booking: ACCEPTED_BOOKING, actorUid: 'renter-1', reason: failRes.reason });
  assert.equal(failEv.from, 'Accepted');
  assert.equal(failEv.to, 'Accepted');

  const okRes = await provider.charge({ amountPaise: 1052000, bookingId: 'bk-pay-1', outcome: 'success' });
  assert.equal(okRes.ok, true);
  assert.ok(okRes.paymentId.startsWith('sim_pay_'));
});

test('planMarkBookingPaid moves Accepted -> Paid and sets depositState = held (M7.4)', () => {
  const wrongActor = planMarkBookingPaid({
    booking: ACCEPTED_BOOKING,
    actorUid: 'owner-1',
    paymentResult: { ok: true, paymentId: 'sim_1', amountPaise: 1052000 },
  });
  assert.equal(wrongActor.ok, false);

  const paid = planMarkBookingPaid({
    booking: ACCEPTED_BOOKING,
    actorUid: 'renter-1',
    paymentResult: { ok: true, paymentId: 'sim_1', amountPaise: 1052000 },
  });
  assert.equal(paid.ok, true);
  assert.equal(paid.bookingPatch.status, 'Paid');
  assert.equal(paid.bookingPatch.depositState, 'held');
  assert.equal(paid.event.to, 'Paid');
  assert.equal(paid.systemMessage.type, 'system');
});

test('renderCheckoutMarkup displays fee, deposit, total, and Test mode notice (M7.3)', () => {
  const markup = renderCheckoutMarkup({
    booking: ACCEPTED_BOOKING,
    error: 'Simulated decline',
    outcome: 'fail',
  }).toString();

  assert.ok(markup.includes('Service fee'));
  assert.ok(markup.includes('₹120'));
  assert.ok(markup.includes('₹8,000'));
  assert.ok(markup.includes('₹10,520'));
  assert.ok(markup.includes('Test mode: no real money moves'));
  assert.ok(markup.includes('Simulated decline'));
});

test('firestore.rules enforces depositState == held when transitioning Accepted -> Paid', () => {
  const rules = fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  assert.ok(rules.includes("from == 'Accepted' && to == 'Paid' && data.depositState == 'held'"));
});
