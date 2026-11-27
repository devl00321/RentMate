import test from 'node:test';
import assert from 'node:assert/strict';
import { renderChatMarkup } from '../../src/components/chatMarkup.js';

const BOOKING = {
  id: 'bk-1',
  ownerId: 'owner-1',
  ownerName: 'Asha',
  renterId: 'renter-1',
  renterName: 'Ravi',
  status: 'Negotiating',
  terms: { dailyPaise: 120000, depositPaise: 800000, pickupTime: '10:00' },
};

test('renderChatMarkup renders aria-live, text bubbles, offer bubbles, and system messages', () => {
  const out = renderChatMarkup({
    booking: BOOKING,
    currentUid: 'renter-1',
    actor: 'renter',
    messages: [
      { id: 'm1', senderId: 'renter-1', type: 'text', text: 'Can we do ₹1,000/day?' },
      {
        id: 'm2',
        senderId: 'owner-1',
        type: 'offer',
        offer: { dailyPaise: 110000, depositPaise: 800000, pickupTime: '09:30' },
      },
      { id: 'm3', senderId: 'renter-1', type: 'system', text: 'Offer accepted.' },
    ],
  }).toString();

  assert.ok(out.includes('aria-live="polite"'));
  assert.ok(out.includes('msg--me'));
  assert.ok(out.includes('Counter-offer from Asha'));
  assert.ok(out.includes('data-accept-offer="m2"'));
  assert.ok(out.includes('Offer accepted.'));
});

test('renderChatMarkup hides offer acceptance and counter buttons once Accepted', () => {
  const out = renderChatMarkup({
    booking: { ...BOOKING, status: 'Accepted' },
    currentUid: 'renter-1',
    actor: 'renter',
    messages: [
      {
        id: 'm2',
        senderId: 'owner-1',
        type: 'offer',
        offer: { dailyPaise: 110000, depositPaise: 800000, pickupTime: '09:30' },
      },
    ],
  }).toString();

  assert.equal(out.includes('data-accept-offer'), false);
  assert.ok(out.includes('Terms are locked for status'));
});
