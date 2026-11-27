import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildReviewId,
  buildReviewPayload,
  computeReputationFromReviews,
  computeUpdatedReputation,
  validateReviewInput,
} from '../../src/domain/reputation.js';

test('buildReviewId creates deterministic bookingId_authorId keys (M8.4)', () => {
  assert.equal(buildReviewId('bk-10', 'user-2'), 'bk-10_user-2');
});

test('computeUpdatedReputation and computeReputationFromReviews pass table cases (M8.5)', () => {
  const cases = [
    { currentAvg: 0, currentCount: 0, newRating: 5, expected: { ratingAvg: 5, ratingCount: 1 } },
    { currentAvg: 5, currentCount: 1, newRating: 4, expected: { ratingAvg: 4.5, ratingCount: 2 } },
    { currentAvg: 4.5, currentCount: 2, newRating: 4, expected: { ratingAvg: 4.33, ratingCount: 3 } },
  ];
  for (const tc of cases) {
    assert.deepEqual(computeUpdatedReputation(tc), tc.expected);
  }

  assert.deepEqual(computeReputationFromReviews([]), { ratingAvg: 0, ratingCount: 0 });
  assert.deepEqual(computeReputationFromReviews([{ rating: 5 }, { rating: 4 }, { rating: 4 }]), {
    ratingAvg: 4.33,
    ratingCount: 3,
  });
});

test('buildReviewPayload blocks incomplete bookings, self-reviews, and bad ratings', () => {
  const activeBooking = { id: 'b1', status: 'Returned', ownerId: 'o1', renterId: 'r1' };
  assert.equal(
    buildReviewPayload({ booking: activeBooking, authorUid: 'r1', rating: 5, text: 'Great' }).ok,
    false,
  );

  const completed = { id: 'b1', status: 'Completed', ownerId: 'o1', renterId: 'r1' };
  const stranger = buildReviewPayload({ booking: completed, authorUid: 'stranger', rating: 5, text: 'Hi' });
  assert.equal(stranger.ok, false);

  assert.equal(validateReviewInput({ rating: 6, text: 'Ok' }).ok, false);
  assert.equal(validateReviewInput({ rating: 5, text: 'x'.repeat(601) }).ok, false);

  const ok = buildReviewPayload({
    booking: completed,
    authorUid: 'r1',
    authorName: 'Ravi',
    rating: 5,
    text: 'Camera was spotless and pickup was punctual.',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.reviewId, 'b1_r1');
  assert.equal(ok.data.subjectId, 'o1');
});

test('firestore.rules enforces deterministic review ID, Completed booking, and no edits', () => {
  const rules = fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  assert.ok(rules.includes('match /reviews/{reviewId}'));
  assert.ok(rules.includes("reviewId == request.resource.data.bookingId + '_' + request.auth.uid"));
  assert.ok(rules.includes("data.status == 'Completed'"));
  assert.ok(rules.includes('request.resource.data.subjectId != request.auth.uid'));
});
