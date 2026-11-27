/**
 * Test-mode checkout breakdown markup and modal dialog (M7.3, M7.5).
 */
import { countDays } from '../domain/dates.js';
import { formatPaise, html, renderHtml } from './dom.js';
import { button } from './ui.js';

/**
 * Pure checkout breakdown markup (exported for unit tests).
 * @param {{ booking: any, error?: string, outcome?: 'success' | 'fail' }} opts
 */
export function renderCheckoutMarkup({ booking, error = '', outcome = 'success' }) {
  const days = countDays(booking.startDate, booking.endDate) || 1;
  const amounts = booking.amounts || { rental: 0, fee: 0, deposit: 0, renterPays: 0 };
  const terms = booking.terms || { dailyPaise: 0 };

  return html`
    <div style="display:grid;gap:var(--s4)">
      <p class="note">Test mode: no real money moves. Simulated checkout holds the refundable deposit until return.</p>
      <dl class="rows">
        <div><dt>Rental, ${formatPaise(terms.dailyPaise)} × ${days} day${days === 1 ? '' : 's'}</dt><dd>${formatPaise(amounts.rental)}</dd></div>
        <div><dt>Service fee (5% PLACEHOLDER)</dt><dd>${formatPaise(amounts.fee)}</dd></div>
        <div><dt>Refundable security deposit</dt><dd>${formatPaise(amounts.deposit)}</dd></div>
        <div class="total"><dt>You pay now (test mode)</dt><dd>${formatPaise(amounts.renterPays)}</dd></div>
      </dl>

      <fieldset style="border:1px solid var(--mist);border-radius:var(--r-ctl);padding:var(--s3);display:grid;gap:var(--s2)">
        <legend style="font-weight:600;padding:0 var(--s1)">Test gateway outcome</legend>
        <label style="display:flex;gap:var(--s2);align-items:center">
          <input type="radio" name="pay-outcome" value="success" ${outcome === 'success' ? 'checked' : ''}>
          <span>Simulate successful payment</span>
        </label>
        <label style="display:flex;gap:var(--s2);align-items:center">
          <input type="radio" name="pay-outcome" value="fail" ${outcome === 'fail' ? 'checked' : ''}>
          <span>Simulate failed payment (test retry)</span>
        </label>
      </fieldset>

      ${error ? html`<div class="chip chip--danger" role="alert">${error}</div>` : ''}
    </div>
  `;
}

/**
 * Open test-mode checkout modal inside #modal-root with retry support on failure.
 * @param {{ booking: any, onPay: (outcome: 'success' | 'fail') => Promise<void> }} opts
 */
export function openCheckoutModal({ booking, onPay }) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let error = '';
  let outcome = /** @type {'success' | 'fail'} */ ('success');
  let busy = false;

  function close() {
    document.removeEventListener('keydown', onKeyDown);
    modalRoot.innerHTML = '';
    previousFocus?.focus();
  }
  function onKeyDown(e) {
    if (e.key === 'Escape' && !busy) close();
  }
  document.addEventListener('keydown', onKeyDown);

  function paint() {
    renderHtml(
      modalRoot,
      html`
        <div class="modal-backdrop" data-checkout-backdrop>
          <div class="card modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <div class="modal__head">
              <h2 id="checkout-title">Checkout (test mode)</h2>
              <button type="button" class="btn btn--ghost" data-checkout-close ${busy ? 'disabled' : ''}>Close</button>
            </div>
            ${renderCheckoutMarkup({ booking, error, outcome })}
            <div class="modal__actions">
              <button type="button" class="btn btn--ghost" data-checkout-close ${busy ? 'disabled' : ''}>Cancel</button>
              ${button({ label: error ? 'Retry payment' : 'Pay and confirm', busy, attrs: 'data-checkout-pay' })}
            </div>
          </div>
        </div>
      `,
    );

    modalRoot.querySelectorAll('[name="pay-outcome"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        outcome = /** @type {any} */ (/** @type {HTMLInputElement} */ (e.target).value);
      });
    });
    modalRoot.querySelectorAll('[data-checkout-close]').forEach((el) => el.addEventListener('click', () => !busy && close()));
    modalRoot.querySelector('[data-checkout-backdrop]')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget && !busy) close();
    });
    modalRoot.querySelector('[data-checkout-pay]')?.addEventListener('click', async () => {
      busy = true;
      error = '';
      paint();
      try {
        await onPay(outcome);
        close();
      } catch (err) {
        error = err.message || 'Payment failed in test mode. Booking stays Accepted — retry.';
        busy = false;
        paint();
      }
    });
  }

  paint();
}
