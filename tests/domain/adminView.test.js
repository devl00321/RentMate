import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAdminDetailMarkup } from '../../src/components/adminViewMarkup.js';

test('renderAdminDetailMarkup displays condition photos, chat, events, and decision controls (M9.3)', () => {
  const htmlStr = renderAdminDetailMarkup({
    report: {
      id: 'rep-1',
      kind: 'dispute',
      bookingId: 'bk-1',
      listingTitle: 'Sony Mirrorless Camera',
      reason: 'Scratch on lens hood.',
    },
    evidence: {
      booking: {
        id: 'bk-1',
        startDate: '2026-12-05',
        endDate: '2026-12-07',
        depositState: 'held',
        amounts: { deposit: 800000, renterPays: 1052000 },
        confirmations: {
          handoverPhotoUrl: 'https://cdn/pickup.jpg',
          returnPhotoUrl: 'https://cdn/return.jpg',
        },
      },
      messages: [{ type: 'text', text: 'I noticed a scratch at drop-off.' }],
      events: [{ from: 'Handed Over', to: 'Disputed', note: 'Scratch on lens hood.' }],
    },
  }).toString();

  assert.ok(htmlStr.includes('https://cdn/pickup.jpg'));
  assert.ok(htmlStr.includes('https://cdn/return.jpg'));
  assert.ok(htmlStr.includes('I noticed a scratch at drop-off.'));
  assert.ok(htmlStr.includes('Handed Over → Disputed'));
  assert.ok(htmlStr.includes('Release deposit to renter'));
  assert.ok(htmlStr.includes('Forfeit deposit to owner'));
  assert.ok(htmlStr.includes('Cancel &amp; refund all'));
});
