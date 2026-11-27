import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildListingUpdatePayload, isValidListingStatus } from '../../src/domain/listing.js';

test('buildListingUpdatePayload omits ownerId and status and validates fields', () => {
  const res = buildListingUpdatePayload({
    photos: ['https://cdn/a.jpg'],
    title: 'Updated Camera',
    category: 'Cameras & Lenses',
    description: 'Updated description with accessories.',
    city: 'Pune',
    dailyRupees: '950',
    depositRupees: '5000',
    availability: [{ start: '2026-12-01', end: '2026-12-10' }],
    ownerId: 'attacker-uid',
    status: 'removed',
  });
  assert.equal(res.ok, true);
  assert.equal('ownerId' in res.data, false);
  assert.equal('status' in res.data, false);
  assert.equal(res.data.dailyPaise, 95000);
});

test('isValidListingStatus accepts active, paused, removed only', () => {
  assert.equal(isValidListingStatus('active'), true);
  assert.equal(isValidListingStatus('paused'), true);
  assert.equal(isValidListingStatus('removed'), true);
  assert.equal(isValidListingStatus('deleted'), false);
});

test('firestore.rules enforces listing ownership, active read, and immutable ownerId', () => {
  const rules = fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  assert.ok(rules.includes('match /listings/{listingId}'));
  assert.ok(rules.includes("resource.data.status == 'active'"));
  assert.ok(rules.includes('request.resource.data.ownerId == request.auth.uid'));
  assert.ok(rules.includes("!request.resource.data.diff(resource.data).affectedKeys().hasAny(['ownerId', 'createdAt'])"));
  assert.ok(rules.includes('allow delete: if false;'));
});
