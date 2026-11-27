import test from 'node:test';
import assert from 'node:assert/strict';
import { renderListingDetailMarkup } from '../../src/components/listingDetailView.js';

test('renderListingDetailMarkup displays gallery, verified owner, availability, and test-mode notice', () => {
  const htmlStr = renderListingDetailMarkup(
    {
      id: 'item-1',
      ownerId: 'u1',
      ownerName: 'Asha',
      ownerVerified: true,
      ownerRating: 4.9,
      ownerRatingCount: 31,
      title: 'Sony Mirrorless Camera',
      description: 'Includes two lenses and spare battery.',
      category: 'Cameras & Lenses',
      city: 'Bengaluru',
      photos: ['https://cdn/1.jpg', 'https://cdn/2.jpg'],
      dailyPaise: 120000,
      depositPaise: 800000,
      availability: [{ start: '2026-12-01', end: '2026-12-10' }],
    },
    { activeIndex: 1, isOwner: false },
  ).toString();

  assert.ok(htmlStr.includes('Sony Mirrorless Camera photo 2'));
  assert.ok(htmlStr.includes('aria-pressed="true"'));
  assert.ok(htmlStr.includes('2026-12-01 → 2026-12-10'));
  assert.ok(htmlStr.includes('Test mode: no real money moves'));
  assert.ok(htmlStr.includes('Request dates'));
});
