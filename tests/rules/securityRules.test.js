import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');

test('firestore.rules enforces default deny at root fallback (rules/03 s2)', () => {
  assert.ok(rules.includes('match /{document=**}'));
  assert.ok(rules.includes('allow read, write: if false;'));
});

test('firestore.rules covers all 6 mandatory rules/03 s6 checks', () => {
  // 1. Unauthenticated read only for active listings (paused/removed require owner/admin)
  assert.ok(rules.includes("allow read: if resource.data.status == 'active'"));
  // 2. Non-owner cannot edit a listing; ownerId cannot change
  assert.ok(rules.includes('resource.data.ownerId == request.auth.uid'));
  assert.ok(rules.includes("affectedKeys().hasAny(['ownerId', 'createdAt'])"));
  // 3. Stranger cannot read another booking or its chat/events
  assert.ok(rules.includes('allow read: if isBookingParty(resource.data) || isAdmin();'));
  assert.ok(rules.includes('match /messages/{messageId}'));
  // 4. Illegal status jumps & post-Accepted term tampering blocked
  assert.ok(rules.includes('isValidBookingTransition(resource.data.status, request.resource.data.status, request.resource.data)'));
  assert.ok(rules.includes("hasAny(['terms', 'amounts', 'startDate', 'endDate'])"));
  // 5. Duplicate review impossible via deterministic ID and no update/delete
  assert.ok(rules.includes("reviewId == request.resource.data.bookingId + '_' + request.auth.uid"));
  assert.ok(rules.includes("data.status == 'Completed'"));
  // 6. Double-booking lock: bookedDays update forbidden, create requires booking party
  assert.ok(rules.includes('match /bookedDays/{dayStr}'));
  assert.ok(rules.includes('allow update: if false;'));
});

test('firestore.rules blocks client writes to privileged user fields and restricts admin ops', () => {
  assert.ok(rules.includes("hasAny(['role', 'verified', 'ratingAvg', 'ratingCount', 'createdAt'])"));
  assert.ok(rules.includes("from == 'Disputed' && to in ['Completed', 'Cancelled'] && isAdmin()"));
  assert.ok(rules.includes('match /reports/{reportId}'));
  assert.ok(rules.includes('allow update: if isAdmin()'));
});
