/**
 * Handover & return condition photo verification UI component (M8.1, M8.2, M8.3).
 */
import { BOOKING_STATUS } from '../config/constants.js';
import { confirmHandover, confirmReturn, releaseDepositAndComplete } from '../services/handover.js';
import { html, renderHtml } from './dom.js';
import { mountPhotoUploader } from './photoUploader.js';
import { showToast } from './toast.js';
import { button, chip, field } from './ui.js';

/**
 * Pure status summary for handover/return photos (exported for tests).
 * @param {any} booking
 * @param {'owner' | 'renter' | 'admin' | null} actor
 */
export function renderHandoverSummaryMarkup(booking, actor) {
  const c = booking.confirmations || {};
  const isPaid = booking.status === BOOKING_STATUS.PAID;
  const isHanded = booking.status === BOOKING_STATUS.HANDED_OVER;
  const isReturned = booking.status === BOOKING_STATUS.RETURNED;
  const alreadyConfirmedPickup =
    (actor === 'owner' && c.ownerHandover) || (actor === 'renter' && c.renterHandover);
  const alreadyConfirmedReturn =
    (actor === 'owner' && c.ownerReturn) || (actor === 'renter' && c.renterReturn);

  return html`
    <div style="display:grid;gap:var(--s3)">
      <div style="display:flex;flex-wrap:wrap;gap:var(--s2)">
        ${chip(`Pickup: owner ${c.ownerHandover ? '✓' : 'pending'}`, c.ownerHandover ? 'held' : 'default')}
        ${chip(`Pickup: renter ${c.renterHandover ? '✓' : 'pending'}`, c.renterHandover ? 'held' : 'default')}
        ${chip(`Return: renter ${c.renterReturn ? '✓' : 'pending'}`, c.renterReturn ? 'held' : 'default')}
        ${chip(`Return: owner ${c.ownerReturn ? '✓' : 'pending'}`, c.ownerReturn ? 'held' : 'default')}
      </div>

      ${c.handoverPhotoUrl || c.returnPhotoUrl
        ? html`
            <div style="display:flex;gap:var(--s3);flex-wrap:wrap">
              ${c.handoverPhotoUrl
                ? html`<figure style="margin:0"><img src="${c.handoverPhotoUrl}" alt="Pickup condition photo" width="160" height="120" style="border-radius:var(--r-tag);object-fit:cover"><figcaption class="muted">Pickup condition</figcaption></figure>`
                : ''}
              ${c.returnPhotoUrl
                ? html`<figure style="margin:0"><img src="${c.returnPhotoUrl}" alt="Return condition photo" width="160" height="120" style="border-radius:var(--r-tag);object-fit:cover"><figcaption class="muted">Return condition</figcaption></figure>`
                : ''}
            </div>
          `
        : ''}

      ${(isPaid && !alreadyConfirmedPickup) || (isHanded && !alreadyConfirmedReturn)
        ? html`
            <div style="display:grid;gap:var(--s3);border-top:1px solid var(--mist);padding-top:var(--s3)">
              <div data-condition-uploader></div>
              ${field({ id: 'cond-photo-url', label: 'Or condition photo HTTPS URL', type: 'url', placeholder: 'https://...' })}
              ${button({
                label: isPaid ? 'Confirm pickup' : 'Confirm return',
                attrs: isPaid ? 'data-confirm-pickup' : 'data-confirm-return',
              })}
            </div>
          `
        : ''}

      ${isReturned && actor === 'owner'
        ? html`
            <div style="display:grid;gap:var(--s2);border-top:1px solid var(--mist);padding-top:var(--s3)">
              <p class="note">Test mode: no real money moves. Confirm return condition and release deposit.</p>
              ${button({ label: 'Release deposit', attrs: 'data-release-deposit' })}
            </div>
          `
        : ''}
    </div>
  `;
}

/**
 * Mount interactive handover/return controls inside `[data-handover-slot]`.
 * @param {Element} container
 * @param {{ booking: any, actor: 'owner' | 'renter' | 'admin' | null, currentUid: string, onUpdated: () => void }} opts
 */
export function mountHandoverPanel(container, { booking, actor, currentUid, onUpdated }) {
  let uploadedUrl = '';
  renderHtml(container, renderHandoverSummaryMarkup(booking, actor));

  const upSlot = container.querySelector('[data-condition-uploader]');
  if (upSlot) {
    mountPhotoUploader(upSlot, {
      photos: uploadedUrl ? [uploadedUrl] : [],
      maxPhotos: 1,
      labelPrefix: 'Condition',
      onChange: (next) => {
        uploadedUrl = next[0] || '';
      },
    });
  }

  function getPhotoUrl() {
    const manual = /** @type {HTMLInputElement | null} */ (container.querySelector('#cond-photo-url'))?.value.trim() || '';
    return uploadedUrl || manual;
  }

  container.querySelector('[data-confirm-pickup]')?.addEventListener('click', async (e) => {
    const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    try {
      await confirmHandover({ booking, actorUid: currentUid, photoUrl: getPhotoUrl() });
      showToast('Pickup confirmed', { variant: 'success' });
      onUpdated();
    } catch (err) {
      showToast(err.message, { variant: 'error' });
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
  });

  container.querySelector('[data-confirm-return]')?.addEventListener('click', async (e) => {
    const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    try {
      await confirmReturn({ booking, actorUid: currentUid, photoUrl: getPhotoUrl() });
      showToast('Return confirmed', { variant: 'success' });
      onUpdated();
    } catch (err) {
      showToast(err.message, { variant: 'error' });
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
  });

  container.querySelector('[data-release-deposit]')?.addEventListener('click', async (e) => {
    const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    try {
      await releaseDepositAndComplete({ booking, actorUid: currentUid });
      showToast('Deposit released (test mode)', { variant: 'success' });
      onUpdated();
    } catch (err) {
      showToast(err.message, { variant: 'error' });
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
  });
}
