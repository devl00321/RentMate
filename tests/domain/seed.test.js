import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES } from '../../src/config/constants.js';
import { SAMPLE_LISTINGS } from '../../src/config/seedListings.js';
import { validateAvailabilityRanges } from '../../src/domain/listing.js';

test('SAMPLE_LISTINGS provides 12 clearly labelled valid sample items', () => {
  assert.equal(SAMPLE_LISTINGS.length, 12);
  const seenIds = new Set();
  for (const item of SAMPLE_LISTINGS) {
    assert.equal(item.isSample, true);
    assert.ok(item.title.startsWith('Sample:'));
    assert.ok(CATEGORIES.includes(item.category));
    assert.ok(Number.isInteger(item.dailyPaise) && item.dailyPaise >= 100);
    assert.ok(Number.isInteger(item.depositPaise) && item.depositPaise >= 0);
    assert.equal(validateAvailabilityRanges(item.availability).ok, true);
    assert.equal(seenIds.has(item.id), false);
    seenIds.add(item.id);
  }
});
