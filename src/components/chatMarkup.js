/**
 * Pure negotiation chat markup builder (components/ layer, zero Firebase imports).
 * Supports text bubbles, offer bubbles, system messages, and aria-live announcements.
 */
import { BOOKING_STATUS, FIELD_LIMITS } from '../config/constants.js';
import { formatPaise, html } from './dom.js';
import { button, field } from './ui.js';

/**
 * Render chat stream + message form + optional counter-offer form.
 * @param {object} opts
 * @param {any} opts.booking
 * @param {any[]} opts.messages
 * @param {string} opts.currentUid
 * @param {'owner' | 'renter' | 'admin' | null} opts.actor
 * @param {boolean} [opts.showOfferForm]
 * @param {string} [opts.error]
 */
export function renderChatMarkup({
  booking,
  messages = [],
  currentUid,
  actor,
  showOfferForm = false,
  error = '',
}) {
  const canNegotiate =
    (booking.status === BOOKING_STATUS.REQUESTED ||
      booking.status === BOOKING_STATUS.NEGOTIATING) &&
    (actor === 'owner' || actor === 'renter');
  const canChat = actor === 'owner' || actor === 'renter';

  const lastOfferId = [...messages].reverse().find((m) => m.type === 'offer')?.id || '';
  const terms = booking.terms || { dailyPaise: 0, depositPaise: 0, pickupTime: '10:00' };

  return html`
    <div style="display:grid;gap:var(--s4)">
      <div class="chat chat-stream" aria-live="polite" aria-label="Booking messages" data-chat-list>
        ${messages.length === 0
          ? html`<p class="muted">No messages yet. Ask a question or send a counter-offer.</p>`
          : messages.map((msg) => {
              const isMe = msg.senderId === currentUid;
              if (msg.type === 'system') {
                return html`<p class="note">${msg.text}</p>`;
              }
              if (msg.type === 'offer' && msg.offer) {
                const isLatestActionable =
                  canNegotiate && msg.id === lastOfferId && !isMe;
                const senderLabel =
                  msg.senderId === booking.ownerId ? booking.ownerName : booking.renterName;
                return html`
                  <div class="offer">
                    <strong>Counter-offer from ${senderLabel || 'member'}</strong>
                    <span>${formatPaise(msg.offer.dailyPaise)}/day, deposit ${formatPaise(msg.offer.depositPaise)}, pickup ${msg.offer.pickupTime}</span>
                    ${isLatestActionable
                      ? html`
                          <div class="actions">
                            <button
                              type="button"
                              class="btn"
                              data-accept-offer="${msg.id}"
                            >Accept offer</button>
                            <button type="button" class="btn btn--ghost" data-toggle-offer>Counter</button>
                          </div>
                        `
                      : ''}
                  </div>
                `;
              }
              return html`<p class="msg${isMe ? ' msg--me' : ''}">${msg.text}</p>`;
            })}
      </div>

      ${error ? html`<div class="chip chip--danger" role="alert">${error}</div>` : ''}

      ${canChat
        ? html`
            <form class="chat-composer" data-chat-form>
              <div class="field" style="flex:1">
                <label class="sr-only" for="chat-text">Message</label>
                <input
                  id="chat-text"
                  name="text"
                  maxlength="${FIELD_LIMITS.MESSAGE_MAX}"
                  placeholder="Write a message (max ${FIELD_LIMITS.MESSAGE_MAX} chars)..."
                  required
                >
              </div>
              ${button({ label: 'Send', type: 'submit', attrs: 'data-send-msg' })}
              ${canNegotiate
                ? button({
                    label: showOfferForm ? 'Hide offer' : 'Send offer',
                    variant: 'ghost',
                    attrs: 'data-toggle-offer',
                  })
                : ''}
            </form>
          `
        : ''}

      ${canNegotiate && showOfferForm
        ? html`
            <form class="card panel" style="background:var(--chalk)" data-offer-form>
              <h3>Propose new terms</h3>
              <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
                ${field({
                  id: 'offer-daily',
                  name: 'dailyRupees',
                  type: 'number',
                  label: 'Daily price (₹)',
                  value: String(Math.round((terms.dailyPaise || 0) / 100)),
                  required: true,
                })}
                ${field({
                  id: 'offer-deposit',
                  name: 'depositRupees',
                  type: 'number',
                  label: 'Deposit (₹)',
                  value: String(Math.round((terms.depositPaise || 0) / 100)),
                  required: true,
                })}
                ${field({
                  id: 'offer-pickup',
                  name: 'pickupTime',
                  label: 'Pickup time',
                  value: terms.pickupTime || '10:00',
                  placeholder: '10:00 AM',
                  required: true,
                })}
              </div>
              <div>${button({ label: 'Send counter-offer', type: 'submit', attrs: 'data-send-offer' })}</div>
            </form>
          `
        : ''}

      ${!canNegotiate && canChat
        ? html`<p class="muted" style="font-size:var(--fs-s)">Terms are locked for status <strong>${booking.status}</strong>. Use messages above to coordinate pickup and return.</p>`
        : ''}
    </div>
  `;
}
