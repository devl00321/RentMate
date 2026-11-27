/**
 * 4-step listing creation/editing form with live card preview and inline validation (M3.2).
 */
import { CATEGORIES, MAX_LISTING_PHOTOS } from '../config/constants.js';
import { html, renderHtml } from '../components/dom.js';
import { button, field } from '../components/ui.js';
import { listingCard } from '../components/listingCard.js';
import { stepper } from '../components/stepper.js';
import { mountPhotoUploader } from '../components/photoUploader.js';
import { mountAvailabilityEditor } from '../components/availabilityEditor.js';
import { showToast } from '../components/toast.js';
import { buildListingPayload, rupeesToPaise, validateListingStep } from '../domain/listing.js';

const STEPS = ['Photos', 'Details', 'Price & deposit', 'Available dates'];

/**
 * Render 4-step listing form view.
 * @param {Element} outlet
 * @param {{ user: { uid: string, name?: string | null }, navigate: (p: string) => void }} ctx
 */
export function render(outlet, ctx) {
  let step = 1;
  let errors = /** @type {Record<string, string>} */ ({});
  const draft = {
    photos: /** @type {string[]} */ ([]),
    title: '',
    category: CATEGORIES[0],
    description: '',
    city: '',
    dailyRupees: '',
    depositRupees: '',
    availability: /** @type {Array<{ start: string, end: string }>} */ ([]),
  };

  function renderPreview(container) {
    if (!container) return;
    renderHtml(
      container,
      listingCard(
        {
          title: draft.title || 'Your item title',
          category: draft.category,
          city: draft.city || 'Your city',
          photos: draft.photos,
          dailyPaise: rupeesToPaise(draft.dailyRupees || 0) || 0,
          depositPaise: rupeesToPaise(draft.depositRupees || 0) || 0,
          ownerName: ctx.user?.name || 'You',
          ownerRating: 0,
          ownerRatingCount: 0,
          ownerVerified: false,
        },
        { preview: true },
      ),
    );
  }

  function syncInputsFromDom() {
    if (step === 2) {
      draft.title = /** @type {HTMLInputElement | null} */ (outlet.querySelector('#list-title'))?.value ?? draft.title;
      draft.category = /** @type {HTMLSelectElement | null} */ (outlet.querySelector('#list-cat'))?.value ?? draft.category;
      draft.description = /** @type {HTMLTextAreaElement | null} */ (outlet.querySelector('#list-desc'))?.value ?? draft.description;
      draft.city = /** @type {HTMLInputElement | null} */ (outlet.querySelector('#list-city'))?.value ?? draft.city;
    } else if (step === 3) {
      draft.dailyRupees = /** @type {HTMLInputElement | null} */ (outlet.querySelector('#list-daily'))?.value ?? draft.dailyRupees;
      draft.depositRupees = /** @type {HTMLInputElement | null} */ (outlet.querySelector('#list-deposit'))?.value ?? draft.depositRupees;
    }
  }

  function paint() {
    const catOpts = CATEGORIES.map((c) => ({ value: c, label: c }));
    renderHtml(
      outlet,
      html`
        <section style="display:grid;gap:var(--s5);margin:var(--s5) 0">
          <h1>List an item</h1>
          ${stepper(STEPS, step)}
          <div class="booking">
            <div class="card panel">
              <h2>Step ${step} of 4: ${STEPS[step - 1]}</h2>
              <div data-step-body></div>
              <div style="display:flex;justify-content:space-between;gap:var(--s3);flex-wrap:wrap;padding-top:var(--s3);border-top:1px solid var(--mist)">
                ${step > 1 ? button({ label: 'Back', variant: 'ghost', attrs: 'data-prev-step' }) : html`<span></span>`}
                ${step < 4
                  ? button({ label: 'Next step', attrs: 'data-next-step' })
                  : button({ label: 'Publish listing', attrs: 'data-submit-listing' })}
              </div>
            </div>
            <aside style="display:grid;gap:var(--s3)" aria-label="Live card preview">
              <h2 class="muted" style="font-size:var(--fs-m)">Live card preview</h2>
              <div data-preview-slot></div>
            </aside>
          </div>
        </section>
      `,
    );

    const stepBody = outlet.querySelector('[data-step-body]');
    const previewSlot = outlet.querySelector('[data-preview-slot]');
    renderPreview(previewSlot);

    if (stepBody && step === 1) {
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
            renderPreview(previewSlot);
          },
        });
      }
      stepBody.querySelector('[data-add-photo-url]')?.addEventListener('click', () => {
        const input = /** @type {HTMLInputElement} */ (stepBody.querySelector('#photo-url-fallback'));
        const url = input.value.trim();
        if (!/^https:\/\/.+/i.test(url)) {
          errors.photos = 'Enter a valid URL starting with https://.';
          return paint();
        }
        if (draft.photos.length >= MAX_LISTING_PHOTOS) {
          errors.photos = `Maximum ${MAX_LISTING_PHOTOS} photos allowed.`;
          return paint();
        }
        draft.photos = [...draft.photos, url];
        errors.photos = '';
        paint();
      });
    } else if (stepBody && step === 2) {
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
        syncInputsFromDom();
        renderPreview(previewSlot);
      });
    } else if (stepBody && step === 3) {
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
        syncInputsFromDom();
        renderPreview(previewSlot);
      });
    } else if (stepBody && step === 4) {
      mountAvailabilityEditor(stepBody, {
        ranges: draft.availability,
        error: errors.availability,
        onChange: (next) => {
          draft.availability = next;
          errors.availability = '';
        },
      });
    }

    outlet.querySelector('[data-prev-step]')?.addEventListener('click', () => {
      syncInputsFromDom();
      errors = {};
      step -= 1;
      paint();
    });

    outlet.querySelector('[data-next-step]')?.addEventListener('click', () => {
      syncInputsFromDom();
      errors = validateListingStep(step, draft);
      if (Object.keys(errors).length > 0) return paint();
      step += 1;
      paint();
    });

    outlet.querySelector('[data-submit-listing]')?.addEventListener('click', () => {
      const built = buildListingPayload({
        draft,
        owner: { uid: ctx.user.uid, name: ctx.user.name || 'RentMate Member' },
      });
      if (!built.ok) {
        errors = built.errors;
        return paint();
      }
      showToast('Listing validated (Firestore save wired in M3.3)', { variant: 'success' });
    });
  }

  paint();
}
