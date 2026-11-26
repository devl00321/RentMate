import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING_STATUS, DEPOSIT_STATE } from '../../src/config/constants.js';
import { ribbon } from '../../src/components/ribbon.js';
import { priceTag } from '../../src/components/priceTag.js';
import { ratingStars } from '../../src/components/ratingStars.js';

test('ribbon renders every one of the 9 booking statuses', () => {
  const all = Object.values(BOOKING_STATUS);
  assert.equal(all.length, 9);

  for (const status of all) {
    const out = ribbon({ status }).toString();
    assert.ok(out.includes(`data-status="${status}"`), `Missing status ${status}`);
    assert.ok(out.includes('Booking progress:'), `Missing aria-label for ${status}`);
  }
});

test('ribbon renders deposit-held band from Paid through Returned and vertical orientation', () => {
  const paid = ribbon({ status: BOOKING_STATUS.PAID, orientation: 'vertical' }).toString();
  assert.ok(paid.includes('ribbon--vertical'));
  assert.ok(paid.includes('ribbon-hold'));
  assert.ok(paid.includes('aria-current="step"'));

  const requested = ribbon({ status: BOOKING_STATUS.REQUESTED }).toString();
  assert.ok(!requested.includes('ribbon-hold'));

  const disputedHeld = ribbon({
    status: BOOKING_STATUS.DISPUTED,
    depositState: DEPOSIT_STATE.HELD,
  }).toString();
  assert.ok(disputedHeld.includes('Disputed — under admin review'));
  assert.ok(disputedHeld.includes('ribbon-hold'));
});

test('priceTag and ratingStars format values accurately', () => {
  assert.ok(priceTag(120000).toString().includes('₹1,200'));
  assert.ok(ratingStars(4.9, 31).toString().includes('4.9 (31)'));
  assert.ok(ratingStars(0, 0).toString().includes('New member'));
});
