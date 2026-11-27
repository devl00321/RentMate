/**
 * Listing detail view: keyboard-accessible gallery, owner card, availability, and request panel (M3.4, M3.5).
 */
import { html, renderHtml } from '../components/dom.js';
import { emptyState, errorState } from '../components/emptyState.js';
import { renderListingDetailMarkup } from '../components/listingDetailView.js';
import { showToast } from '../components/toast.js';
import { getListing } from '../services/listings.js';

/**
 * Mount listing detail screen (#/listing/:id).
 * @param {Element} outlet
 * @param {{ params: { id: string }, user?: { uid: string } | null }} ctx
 */
export async function render(outlet, ctx) {
  renderHtml(
    outlet,
    html`
      <section class="card panel" style="margin:var(--s5) 0" aria-busy="true">
        <div class="skeleton" style="aspect-ratio:16/9;max-height:360px"></div>
        <div class="skeleton" style="height:28px;width:55%"></div>
        <div class="skeleton" style="height:18px;width:35%"></div>
      </section>
    `,
  );

  let item = null;
  let loadError = '';

  async function load() {
    loadError = '';
    try {
      item = await getListing(ctx.params.id);
    } catch (err) {
      loadError = err.message || 'Could not load listing.';
    }
  }

  await load();

  let activeIndex = 0;

  function paint() {
    if (loadError) {
      renderHtml(outlet, errorState({ title: 'Could not load listing', message: loadError }));
      outlet.querySelector('[data-retry]')?.addEventListener('click', async () => {
        await load();
        paint();
      });
      return;
    }

    if (!item || item.status === 'removed') {
      renderHtml(
        outlet,
        emptyState({
          title: 'Listing not found',
          message: 'This item is no longer available.',
          actionLabel: 'Browse items',
          actionHref: '#/search',
        }),
      );
      return;
    }

    const isOwner = Boolean(ctx.user?.uid && ctx.user.uid === item.ownerId);
    renderHtml(outlet, renderListingDetailMarkup(item, { activeIndex, isOwner }));

    outlet.querySelectorAll('[data-gallery-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeIndex = Number(btn.getAttribute('data-gallery-idx'));
        paint();
      });
    });

    const total = item.photos?.length || 0;
    outlet.querySelector('[data-gallery-prev]')?.addEventListener('click', () => {
      if (total > 1) {
        activeIndex = (activeIndex - 1 + total) % total;
        paint();
      }
    });
    outlet.querySelector('[data-gallery-next]')?.addEventListener('click', () => {
      if (total > 1) {
        activeIndex = (activeIndex + 1) % total;
        paint();
      }
    });

    outlet.querySelector('[data-request-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Booking request submission will be wired in Milestone M5.', { variant: 'info' });
    });

    outlet.querySelector('[data-report-listing]')?.addEventListener('click', () => {
      showToast('Listing report flow will be wired in Milestone M9.', { variant: 'info' });
    });
  }

  paint();
}
