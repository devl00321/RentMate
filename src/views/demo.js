/**
 * UI component showcase view for verifying states, ribbon statuses, and accessibility.
 */
import { BOOKING_STATUS, DEPOSIT_STATE } from '../config/constants.js';
import { html, renderHtml } from '../components/dom.js';
import { button, chip, field, skeletonCards } from '../components/ui.js';
import { emptyState, errorState } from '../components/emptyState.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { priceTag } from '../components/priceTag.js';
import { ratingStars } from '../components/ratingStars.js';
import { ribbon } from '../components/ribbon.js';
import { mountCalendar } from '../components/calendar.js';

const ALL_STATUSES = Object.values(BOOKING_STATUS);

/**
 * Render all core UI components, states, and all 9 ribbon statuses on #/demo.
 * @param {Element} outlet
 */
export function render(outlet) {
  renderHtml(
    outlet,
    html`
      <div class="hero">
        <h1>Component &amp; state showcase</h1>
        <p class="muted">Reference view for Handover design system primitives (M1.4 &amp; M1.5).</p>
      </div>

      <section class="card panel" aria-labelledby="demo-identity">
        <h2 id="demo-identity">Hang tag price &amp; rating stars</h2>
        <div style="display:flex;flex-wrap:wrap;gap:var(--s4);align-items:center">
          ${priceTag(120000)}
          ${priceTag(45000)}
          ${ratingStars(4.9, 31)}
          ${ratingStars(0, 0)}
        </div>
      </section>

      <div class="section-head"><h2>Handover ribbon (all 9 statuses)</h2></div>
      <div style="display:grid;gap:var(--s4)">
        ${ALL_STATUSES.map(
          (status) => html`
            <article class="card panel">
              <h3>${status}</h3>
              ${ribbon({
                status,
                lastActiveStatus:
                  status === BOOKING_STATUS.DISPUTED ? BOOKING_STATUS.HANDED_OVER : BOOKING_STATUS.ACCEPTED,
                depositState:
                  status === BOOKING_STATUS.DISPUTED ? DEPOSIT_STATE.HELD : '',
              })}
            </article>
          `,
        )}
        <article class="card panel">
          <h3>Vertical ribbon variant</h3>
          ${ribbon({ status: BOOKING_STATUS.PAID, orientation: 'vertical' })}
        </article>
      </div>

      <div class="section-head"><h2>Buttons, chips, modal &amp; toast</h2></div>
      <section class="card panel">
        <div style="display:flex;flex-wrap:wrap;gap:var(--s3)">
          ${button({ label: 'Open modal', attrs: 'data-open-modal' })}
          ${button({ label: 'Show toast', variant: 'ghost', attrs: 'data-show-toast' })}
          ${button({ label: 'Danger action', variant: 'danger', attrs: 'data-show-err-toast' })}
          ${button({ label: 'Saving...', busy: true })}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--s2)">
          ${chip('Active booking')}
          ${chip('Verified & held', 'held')}
          ${chip('Disputed', 'danger')}
        </div>
      </section>

      <div class="section-head"><h2>Form fields</h2></div>
      <section class="card panel">
        <form class="grid" novalidate>
          ${field({ id: 'demo-city', label: 'City', value: 'Bengaluru', hint: 'Shown before booking is paid' })}
          ${field({
            id: 'demo-price',
            label: 'Daily price (₹)',
            type: 'number',
            value: '-10',
            error: 'Enter a daily price above ₹0.',
          })}
          ${field({
            id: 'demo-cat',
            label: 'Category',
            type: 'select',
            value: 'cam',
            options: [
              { value: 'cam', label: 'Cameras & Lenses' },
              { value: 'tools', label: 'Power Tools' },
            ],
          })}
        </form>
      </section>

      <div class="section-head"><h2>Loading skeleton</h2></div>
      ${skeletonCards(3)}

      <div class="section-head"><h2>Availability calendar</h2></div>
      <section class="card panel" style="max-width:420px">
        <div data-demo-calendar></div>
      </section>

      <div class="section-head"><h2>Empty &amp; error states</h2></div>
      <div class="grid">
        ${emptyState({
          title: 'No items match',
          message: 'Try fewer filters or list your own item.',
          actionLabel: 'Browse all',
          actionHref: '#/search',
        })}
        ${errorState({
          title: 'Could not load listings',
          message: 'Your connection dropped. Retry when ready.',
        })}
      </div>
    `,
  );

  outlet.querySelector('[data-open-modal]')?.addEventListener('click', () => {
    openModal({
      title: 'Confirm pickup',
      body: html`<p>Confirm you received the item in good condition.</p>`,
      confirmLabel: 'Confirm pickup',
      onConfirm: () => showToast('Pickup confirmed', { variant: 'success' }),
    });
  });
  outlet.querySelector('[data-show-toast]')?.addEventListener('click', () => {
    showToast('Request sent', { variant: 'success' });
  });
  outlet.querySelector('[data-show-err-toast]')?.addEventListener('click', () => {
    showToast('Payment failed in test mode. Try again.', { variant: 'error' });
  });

  const calSlot = outlet.querySelector('[data-demo-calendar]');
  if (calSlot) {
    mountCalendar(calSlot, {
      availability: [{ start: '2026-12-01', end: '2026-12-28' }],
      bookedDays: ['2026-12-06', '2026-12-07'],
      startDate: '2026-12-10',
      endDate: '2026-12-13',
      onChange: () => {},
    });
  }
}
