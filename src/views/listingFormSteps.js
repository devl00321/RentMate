/**
 * Step body renderers for the 4-step listing editor (split from listingForm.js for <200 line cap).
 */
import { CATEGORIES, MAX_LISTING_PHOTOS } from '../config/constants.js';
import { html, renderHtml } from '../components/dom.js';
import { button, field } from '../components/ui.js';
import { mountPhotoUploader } from '../components/photoUploader.js';
import { mountAvailabilityEditor } from '../components/availabilityEditor.js';

/**
 * Render the active step inside `stepBody` and attach input/change listeners.
 * @param {object} opts
 * @param {Element} opts.stepBody
 * @param {number} opts.step
 * @param {any} opts.draft
 * @param {Record<string, string>} opts.errors
 * @param {() => void} opts.onPreviewUpdate
 * @param {() => void} opts.onRepaint
 */
export function renderListingStep({ stepBody, step, draft, errors, onPreviewUpdate, onRepaint }) {
  const catOpts = CATEGORIES.map((c) => ({ value: c, label: c }));

  if (step === 1) {
    renderHtml(
      stepBody,
      html`
        <div style="display:grid;gap:var(--s4)">
          <div data-uploader-slot></div>
          <div style="display:flex;gap:var(--s2);align-items:end;flex-wrap:wrap">
            ${field({ id: 'photo-url-fallback', label: 'Or paste an HTTPS image URL', type: 'url', placeholder: 'https://...', hint: `Up to ${MAX_LISTING_PHOTOS} photos total` })}
            ${button({ label: 'Add URL', variant: 'ghost', attrs: 'data-add-photo-url' })}
          </div>
          ${errors.photos ? html`<span class="field__error" role="alert">${errors.photos}</span>` : ''}
        </div>
      `,
    );
    const uploaderSlot = stepBody.querySelector('[data-uploader-slot]');
    if (uploaderSlot) {
      mountPhotoUploader(uploaderSlot, {
        photos: draft.photos,
        onChange: (next) => {
          draft.photos = next;
          errors.photos = '';
          onPreviewUpdate();
        },
      });
    }
    stepBody.querySelector('[data-add-photo-url]')?.addEventListener('click', () => {
      const input = /** @type {HTMLInputElement} */ (stepBody.querySelector('#photo-url-fallback'));
      const url = input.value.trim();
      if (!/^https:\/\/.+/i.test(url)) {
        errors.photos = 'Enter a valid URL starting with https://.';
        return onRepaint();
      }
      if (draft.photos.length >= MAX_LISTING_PHOTOS) {
        errors.photos = `Maximum ${MAX_LISTING_PHOTOS} photos allowed.`;
        return onRepaint();
      }
      draft.photos = [...draft.photos, url];
      errors.photos = '';
      onRepaint();
    });
  } else if (step === 2) {
    renderHtml(
      stepBody,
      html`
        <div style="display:grid;gap:var(--s4)">
          ${field({ id: 'list-title', label: 'Item title', value: draft.title, placeholder: 'Mirrorless camera with two lenses', error: errors.title, required: true })}
          ${field({ id: 'list-cat', label: 'Category', type: 'select', value: draft.category, options: catOpts, error: errors.category })}
          ${field({ id: 'list-desc', label: 'Description', type: 'textarea', rows: 4, value: draft.description, placeholder: 'Condition, included accessories, pickup notes...', error: errors.description, required: true })}
          ${field({ id: 'list-city', label: 'City or area', value: draft.city, placeholder: 'Bengaluru', error: errors.city, hint: 'Exact pickup address is shared only after Paid', required: true })}
        </div>
      `,
    );
    stepBody.addEventListener('input', () => {
      draft.title = /** @type {HTMLInputElement | null} */ (stepBody.querySelector('#list-title'))?.value ?? draft.title;
      draft.category = /** @type {HTMLSelectElement | null} */ (stepBody.querySelector('#list-cat'))?.value ?? draft.category;
      draft.description = /** @type {HTMLTextAreaElement | null} */ (stepBody.querySelector('#list-desc'))?.value ?? draft.description;
      draft.city = /** @type {HTMLInputElement | null} */ (stepBody.querySelector('#list-city'))?.value ?? draft.city;
      onPreviewUpdate();
    });
  } else if (step === 3) {
    renderHtml(
      stepBody,
      html`
        <div style="display:grid;gap:var(--s4)">
          ${field({ id: 'list-daily', label: 'Daily rental price (₹)', type: 'number', value: draft.dailyRupees, placeholder: '1200', error: errors.dailyRupees, required: true })}
          ${field({ id: 'list-deposit', label: 'Refundable security deposit (₹)', type: 'number', value: draft.depositRupees, placeholder: '8000', hint: 'Held in test mode until return is confirmed', error: errors.depositRupees })}
        </div>
      `,
    );
    stepBody.addEventListener('input', () => {
      draft.dailyRupees = /** @type {HTMLInputElement | null} */ (stepBody.querySelector('#list-daily'))?.value ?? draft.dailyRupees;
      draft.depositRupees = /** @type {HTMLInputElement | null} */ (stepBody.querySelector('#list-deposit'))?.value ?? draft.depositRupees;
      onPreviewUpdate();
    });
  } else if (step === 4) {
    mountAvailabilityEditor(stepBody, {
      ranges: draft.availability,
      error: errors.availability,
      onChange: (next) => {
        draft.availability = next;
        errors.availability = '';
      },
    });
  }
}
