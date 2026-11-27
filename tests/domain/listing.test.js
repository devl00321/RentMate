import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rupeesToPaise,
  validateAvailabilityRanges,
  validateListingStep,
  buildListingPayload,
} from '../../src/domain/listing.js';
import { listingCard } from '../../src/components/listingCard.js';

test('rupeesToPaise converts accurately without float drift', () => {
  assert.equal(rupeesToPaise(1200), 120000);
  assert.equal(rupeesToPaise('450.50'), 45050);
  assert.equal(Number.isNaN(rupeesToPaise(-10)), true);
});

test('validateListingStep blocks invalid inputs per step', () => {
  assert.ok(validateListingStep(1, { photos: [] }).photos);
  assert.ok(validateListingStep(1, { photos: ['http://insecure.jpg'] }).photos);
  assert.deepEqual(validateListingStep(1, { photos: ['https://cdn/cam.jpg'] }), {});

  assert.ok(validateListingStep(2, { title: 'x', category: 'Bad', description: 'short', city: '' }).title);
  assert.ok(validateListingStep(3, { dailyRupees: '0', depositRupees: '-5' }).dailyRupees);
  assert.ok(validateListingStep(4, { availability: [{ start: '2026-12-10', end: '2026-12-08' }] }).availability);
});

test('buildListingPayload builds normalized listing document', () => {
  const res = buildListingPayload({
    draft: {
      photos: ['https://cdn/cam.jpg'],
      title: 'Sony A7 IV Kit',
      category: 'Cameras & Lenses',
      description: 'Includes 28-70mm lens and two batteries.',
      city: 'Bengaluru',
      dailyRupees: '1200',
      depositRupees: '8000',
      availability: [{ start: '2026-12-01', end: '2026-12-15' }],
    },
    owner: { uid: 'u1', name: 'Asha', ratingAvg: 4.9, ratingCount: 31, verified: true },
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.dailyPaise, 120000);
  assert.equal(res.data.depositPaise, 800000);
  assert.equal(res.data.status, 'active');

  const cardHtml = listingCard({ id: 'l1', ...res.data }).toString();
  assert.ok(cardHtml.includes('₹1,200'));
  assert.ok(cardHtml.includes('Verified'));
  assert.ok(cardHtml.includes('Sony A7 IV Kit'));
});
