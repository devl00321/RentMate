/**
 * 4-step listing creation/editing form with live card preview and Firestore persistence (M3.2 & M3.3).
 */
import { CATEGORIES } from '../config/constants.js';
import { html, renderHtml } from '../components/dom.js';
import { button } from '../components/ui.js';
import { errorState } from '../components/emptyState.js';
import { listingCard } from '../components/listingCard.js';
import { stepper } from '../components/stepper.js';
import { showToast } from '../components/toast.js';
import { buildListingPayload, buildListingUpdatePayload, rupeesToPaise, validateListingStep } from '../domain/listing.js';
import { createListing, getListing, updateListing } from '../services/listings.js';
import { getUserProfile } from '../services/users.js';
import { renderListingStep } from './listingFormSteps.js';

const STEPS = ['Photos', 'Details', 'Price & deposit', 'Available dates'];

/**
 * Render 4-step listing form view (#/list or #/list/:id).
 * @param {Element} outlet
 * @param {{ user: { uid: string, name?: string | null }, params: { id?: string }, navigate: (p: string) => void }} ctx
 */
export async function render(outlet, ctx) {
  const editId = ctx.params?.id || '';
  let step = 1;
  let errors = /** @type {Record<string, string>} */ ({});
  let ownerProfile = null;
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

  if (editId) {
    renderHtml(outlet, html`<section class="card panel"><div class="skeleton" style="height:28px;width:45%"></div></section>`);
    try {
      const existing = await getListing(editId);
      if (!existing || existing.ownerId !== ctx.user.uid) {
        renderHtml(outlet, errorState({ title: 'Cannot edit listing', message: 'Listing not found or belongs to another owner.' }));
        return;
      }
      Object.assign(draft, {
        photos: existing.photos,
        title: existing.title,
        category: existing.category,
        description: existing.description,
        city: existing.city,
        dailyRupees: String(Math.round(existing.dailyPaise / 100)),
        depositRupees: String(Math.round(existing.depositPaise / 100)),
        availability: existing.availability,
      });
    } catch (err) {
      renderHtml(outlet, errorState({ title: 'Could not load listing', message: err.message }));
      return;
    }
  }

  try {
    ownerProfile = await getUserProfile(ctx.user.uid);
  } catch {
    ownerProfile = null;
  }

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
          ownerName: ownerProfile?.name || ctx.user?.name || 'You',
          ownerRating: ownerProfile?.ratingAvg || 0,
          ownerRatingCount: ownerProfile?.ratingCount || 0,
          ownerVerified: Boolean(ownerProfile?.verified),
        },
        { preview: true },
      ),
    );
  }

  function paint() {
    renderHtml(
      outlet,
      html`
        <section style="display:grid;gap:var(--s5);margin:var(--s5) 0">
          <h1>${editId ? 'Edit listing' : 'List an item'}</h1>
          ${stepper(STEPS, step)}
          <div class="booking">
            <div class="card panel">
              <h2>Step ${step} of 4: ${STEPS[step - 1]}</h2>
              <div data-step-body></div>
              <div style="display:flex;justify-content:space-between;gap:var(--s3);flex-wrap:wrap;padding-top:var(--s3);border-top:1px solid var(--mist)">
                ${step > 1 ? button({ label: 'Back', variant: 'ghost', attrs: 'data-prev-step' }) : html`<span></span>`}
                ${step < 4
                  ? button({ label: 'Next step', attrs: 'data-next-step' })
                  : button({ label: editId ? 'Save changes' : 'Publish listing', attrs: 'data-submit-listing' })}
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
    if (stepBody) {
      renderListingStep({
        stepBody,
        step,
        draft,
        errors,
        onPreviewUpdate: () => renderPreview(previewSlot),
        onRepaint: paint,
      });
    }

    outlet.querySelector('[data-prev-step]')?.addEventListener('click', () => {
      errors = {};
      step -= 1;
      paint();
    });

    outlet.querySelector('[data-next-step]')?.addEventListener('click', () => {
      errors = validateListingStep(step, draft);
      if (Object.keys(errors).length > 0) return paint();
      step += 1;
      paint();
    });

    outlet.querySelector('[data-submit-listing]')?.addEventListener('click', async (e) => {
      const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
      const built = editId
        ? buildListingUpdatePayload(draft)
        : buildListingPayload({
            draft,
            owner: {
              uid: ctx.user.uid,
              name: ownerProfile?.name || ctx.user.name || 'RentMate Member',
              photoUrl: ownerProfile?.photoUrl || '',
              ratingAvg: ownerProfile?.ratingAvg || 0,
              ratingCount: ownerProfile?.ratingCount || 0,
              verified: Boolean(ownerProfile?.verified),
            },
          });
      if (!built.ok) {
        errors = built.errors;
        return paint();
      }
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      try {
        if (editId) {
          await updateListing(editId, built.data);
          showToast('Listing updated', { variant: 'success' });
          ctx.navigate(`/listing/${editId}`);
        } else {
          const created = await createListing(built.data);
          showToast('Listing published', { variant: 'success' });
          ctx.navigate(`/listing/${created.id}`);
        }
      } catch (err) {
        showToast(err.message, { variant: 'error' });
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
    });
  }

  paint();
}
