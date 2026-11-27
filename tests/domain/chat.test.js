import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  validateChatText,
  validateOffer,
  createMessageRateLimiter,
  planAcceptOffer,
} from '../../src/domain/chatOps.js';

test('validateChatText blocks empty and over-500-char messages (M6.5)', () => {
  assert.equal(validateChatText('   ').ok, false);
  assert.equal(validateChatText('x'.repeat(501)).ok, false);
  assert.equal(validateChatText('Can I pick it up at 9am?').ok, true);
});

test('validateOffer checks dailyPaise, depositPaise, and pickupTime (M6.2)', () => {
  assert.equal(validateOffer({ dailyPaise: 50, depositPaise: 0, pickupTime: '10:00' }).ok, false);
  assert.equal(validateOffer({ dailyPaise: 100000, depositPaise: -1, pickupTime: '10:00' }).ok, false);
  assert.equal(validateOffer({ dailyPaise: 100000, depositPaise: 500000, pickupTime: '' }).ok, false);
  assert.equal(validateOffer({ dailyPaise: 100000, depositPaise: 500000, pickupTime: '09:30' }).ok, true);
});

test('createMessageRateLimiter blocks rapid bursts and over-minute floods (M6.5)', () => {
  const limiter = createMessageRateLimiter({ minIntervalMs: 1000, maxPerMinute: 3 });
  assert.equal(limiter.checkAndRecord('u1', 1000).ok, true);
  assert.equal(limiter.checkAndRecord('u1', 1200).ok, false); // too fast
  assert.equal(limiter.checkAndRecord('u1', 2500).ok, true);
  assert.equal(limiter.checkAndRecord('u1', 4000).ok, true);
  assert.equal(limiter.checkAndRecord('u1', 6000).ok, false); // >3 per minute
  assert.equal(limiter.checkAndRecord('u1', 62000).ok, true); // window rolled over
});

test('planAcceptOffer updates terms & amounts and freezes booking at Accepted (M6.3)', () => {
  const booking = {
    id: 'bk-1',
    status: 'Negotiating',
    startDate: '2026-12-05',
    endDate: '2026-12-07',
    latestOfferBy: 'owner',
  };
  // Sender cannot accept own offer
  const ownAttempt = planAcceptOffer({
    booking,
    offer: { dailyPaise: 100000, depositPaise: 600000, pickupTime: '09:00' },
    offerSenderRole: 'owner',
    actor: 'owner',
    actorUid: 'owner-1',
    datesFree: true,
  });
  assert.equal(ownAttempt.ok, false);

  // Other party accepts and updates terms/amounts
  const accepted = planAcceptOffer({
    booking,
    offer: { dailyPaise: 100000, depositPaise: 600000, pickupTime: '09:00' },
    offerSenderRole: 'owner',
    actor: 'renter',
    actorUid: 'renter-1',
    datesFree: true,
  });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.bookingPatch.status, 'Accepted');
  assert.deepEqual(accepted.bookingPatch.terms, {
    dailyPaise: 100000,
    depositPaise: 600000,
    pickupTime: '09:00',
  });
  assert.equal(accepted.bookingPatch.amounts.rental, 200000);
  assert.equal(accepted.bookingPatch.amounts.fee, 10000);
  assert.equal(accepted.bookingPatch.amounts.renterPays, 810000);
  assert.deepEqual(accepted.lockDays, ['2026-12-05', '2026-12-06']);
  assert.equal(accepted.systemMessage.type, 'system');
});

test('firestore.rules validates chat messages, offer fields, and prevents edits/deletes', () => {
  const rules = fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  assert.ok(rules.includes('match /messages/{messageId}'));
  assert.ok(rules.includes('request.resource.data.text.size() <= 500'));
  assert.ok(rules.includes("request.resource.data.type != 'offer'"));
  assert.ok(rules.includes('request.resource.data.offer.dailyPaise >= 100'));
});
