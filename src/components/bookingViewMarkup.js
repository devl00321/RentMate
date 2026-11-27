/**
 * Pure booking detail markup builder (components/ layer, zero Firebase imports).
 * Renders Handover ribbon, price breakdown, status actions, and audit log for all 9 statuses.
 */
import { BOOKING_STATUS } from '../config/constants.js';
import { countDays } from '../domain/dates.js';
import { formatPaise, html } from './dom.js';
import { button, chip } from './ui.js';
import { ribbon } from './ribbon.js';

const ADDRESS_VISIBLE = new Set([
  BOOKING_STATUS.PAID,
  BOOKING_STATUS.HANDED_OVER,
  BOOKING_STATUS.RETURNED,
  BOOKING_STATUS.COMPLETED,
]);

const PRE_HANDOVER = new Set([
  BOOKING_STATUS.REQUESTED,
  BOOKING_STATUS.NEGOTIATING,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.PAID,
]);

const DISPUTABLE = new Set([
  BOOKING_STATUS.PAID,
  BOOKING_STATUS.HANDED_OVER,
  BOOKING_STATUS.RETURNED,
]);

/**
 * Determine primary action CTA for the current status and actor.
 * @param {any} booking
 * @param {'owner' | 'renter' | 'admin' | null} actor
 * @returns {{ action: string, label: string } | null}
 */
export function getPrimaryBookingAction(booking, actor) {
  const s = booking.status;
  if (s === BOOKING_STATUS.REQUESTED && actor === 'owner') {
    return { action: 'accept', label: 'Accept request' };
  }
  if (s === BOOKING_STATUS.NEGOTIATING && booking.latestOfferBy && booking.latestOfferBy !== actor) {
    return { action: 'accept', label: 'Accept latest offer' };
  }
  if (s === BOOKING_STATUS.ACCEPTED && actor === 'renter') {
    return { action: 'pay', label: 'Pay and confirm' };
  }
  if (s === BOOKING_STATUS.PAID && (actor === 'owner' || actor === 'renter')) {
    return { action: 'handover', label: 'Confirm pickup' };
  }
  if (s === BOOKING_STATUS.HANDED_OVER && (actor === 'owner' || actor === 'renter')) {
    return { action: 'return', label: 'Confirm return' };
  }
  if (s === BOOKING_STATUS.RETURNED && actor === 'owner') {
    return { action: 'release', label: 'Release deposit' };
  }
  return null;
}

/**
 * Render booking view markup across all 9 statuses.
 * @param {any} booking
 * @param {{ actor: 'owner' | 'renter' | 'admin' | null, events?: any[] }} opts
 */
export function renderBookingMarkup(booking, { actor, events = [] } = {}) {
  const days = countDays(booking.startDate, booking.endDate) || 1;
  const terms = booking.terms || { dailyPaise: 0, depositPaise: 0, pickupTime: '10:00' };
  const amounts = booking.amounts || { rental: 0, fee: 0, deposit: 0, renterPays: 0 };
  const primary = getPrimaryBookingAction(booking, actor);
  const canCancel = PRE_HANDOVER.has(booking.status) && (actor === 'owner' || actor === 'renter');
  const canDispute = DISPUTABLE.has(booking.status) && (actor === 'owner' || actor === 'renter');
  const showAddressNote = ADDRESS_VISIBLE.has(booking.status);

  return html`
    <section style="display:grid;gap:var(--s5);margin:var(--s5) 0" data-booking-status="${booking.status}">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:var(--s3);align-items:start">
        <div style="display:grid;gap:var(--s1)">
          <a href="#/listing/${booking.listingId}" class="muted">View listing</a>
          <h1>${booking.listingTitle || 'Booking'}</h1>
          <p class="muted">${booking.startDate} → ${booking.endDate} (${days} day${days === 1 ? '' : 's'}) · Pickup ${terms.pickupTime || '10:00'}</p>
        </div>
        ${chip(`Your role: ${actor || 'viewer'}`)}
      </div>

      <section class="card panel" aria-label="Booking progress">
        ${ribbon({
          status: booking.status,
          depositState: booking.depositState,
          lastActiveStatus: booking.lastActiveStatus || BOOKING_STATUS.REQUESTED,
        })}
        <p class="muted">
          ${showAddressNote
            ? `City: ${booking.city || 'Confirmed'}. Exact pickup location may now be shared in chat.`
            : `City: ${booking.city || 'Area shown'}. Exact pickup address is hidden until Paid (D-011).`}
        </p>
      </section>

      <div class="booking">
        <div style="display:grid;gap:var(--s5)">
          <section class="card panel" aria-label="Negotiation chat">
            <h2>Chat &amp; counter-offers</h2>
            <div data-chat-slot>
              <p class="muted">Real-time chat and counter-offers will appear here in Milestone M6.</p>
            </div>
          </section>

          <section class="card panel" aria-label="Handover and return">
            <h2>Handover &amp; return verification</h2>
            <div data-handover-slot></div>
          </section>

          <div data-review-slot></div>

          <section class="card panel" aria-label="Booking timeline">
            <h2>Activity log</h2>
            ${events.length > 0
              ? html`
                  <ul style="list-style:none;margin:0;padding:0;display:grid;gap:var(--s2)">
                    ${events.map(
                      (ev) => html`<li class="muted"><strong>${ev.from} → ${ev.to}</strong>${ev.note ? `: ${ev.note}` : ''}</li>`,
                    )}
                  </ul>
                `
              : html`<p class="muted">No events recorded yet.</p>`}
          </section>
        </div>

        <aside class="card card--raised panel sticky-panel" aria-label="Price breakdown">
          <h2>Price for ${days} day${days === 1 ? '' : 's'}</h2>
          <dl class="rows">
            <div><dt>Rental, ${formatPaise(terms.dailyPaise)} × ${days}</dt><dd>${formatPaise(amounts.rental)}</dd></div>
            <div><dt>Service fee (5% PLACEHOLDER)</dt><dd>${formatPaise(amounts.fee)}</dd></div>
            <div><dt>Refundable deposit (${booking.depositState || 'none'})</dt><dd>${formatPaise(amounts.deposit)}</dd></div>
            <div class="total"><dt>Total</dt><dd>${formatPaise(amounts.renterPays)}</dd></div>
          </dl>
          <p class="note">Test mode: no real money moves.</p>
          <div style="display:grid;gap:var(--s2)">
            ${primary ? button({ label: primary.label, attrs: `data-booking-action="${primary.action}"` }) : ''}
            ${canCancel ? button({ label: 'Cancel booking', variant: 'ghost', attrs: 'data-cancel-booking' }) : ''}
            ${canDispute ? button({ label: 'Open dispute', variant: 'danger', attrs: 'data-open-dispute' }) : ''}
          </div>
        </aside>
      </div>
    </section>
  `;
}
