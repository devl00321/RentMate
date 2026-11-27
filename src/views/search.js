/**
 * Search and filters view (M4.4): category, price range, city, dates, sort, pagination, all UI states.
 */
import { CATEGORIES } from '../config/constants.js';
import { SAMPLE_LISTINGS } from '../config/seedListings.js';
import { html, renderHtml } from '../components/dom.js';
import { button, field, skeletonCards } from '../components/ui.js';
import { emptyState, errorState } from '../components/emptyState.js';
import { listingCard } from '../components/listingCard.js';
import { buildSearchHash, filterListingsLocal, normalizeSearchFilters } from '../domain/search.js';
import { searchListings } from '../services/search.js';

/**
 * Render Search view (#/search).
 * @param {Element} outlet
 * @param {{ query: Record<string, string>, navigate: (path: string) => void }} ctx
 */
export async function render(outlet, ctx) {
  const isSampleMode = ctx.query?.sample === '1';
  const filters = normalizeSearchFilters(ctx.query || {});
  const catOpts = [{ value: '', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))];
  const sortOpts = [
    { value: 'newest', label: 'Newest first' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
  ];

  let state = { items: /** @type {any[]} */ ([]), hasMore: false };
  let loading = true;
  let loadingMore = false;
  let loadError = '';

  function paint() {
    let bodyHtml;
    if (loading) {
      bodyHtml = skeletonCards(6);
    } else if (loadError) {
      bodyHtml = html`
        <div style="display:grid;gap:var(--s3)">
          ${errorState({ title: 'Could not load search results', message: loadError })}
          <div style="text-align:center">
            <a class="btn btn--ghost" href="#/search?sample=1">Preview 12 sample items (demo)</a>
          </div>
        </div>
      `;
    } else if (state.items.length === 0) {
      bodyHtml = emptyState({
        title: 'No items match',
        message: 'Try fewer filters or list your own item.',
        actionLabel: 'Clear filters',
        actionHref: isSampleMode ? '#/search?sample=1' : '#/search',
      });
    } else {
      bodyHtml = html`
        <div style="display:grid;gap:var(--s5)">
          <div style="display:flex;flex-wrap:wrap;gap:var(--s2);align-items:center;justify-content:space-between">
            <p class="muted" aria-live="polite">
              Showing ${state.items.length} item${state.items.length === 1 ? '' : 's'}
              ${filters.startDate && filters.endDate ? ` available ${filters.startDate} to ${filters.endDate}` : ''}
            </p>
            ${isSampleMode ? html`<span class="chip chip--danger">Sample catalog (demo only)</span>` : ''}
          </div>
          <div class="grid">${state.items.map((item) => listingCard(item))}</div>
          ${state.hasMore
            ? html`
                <div style="display:flex;justify-content:center">
                  ${button({ label: loadingMore ? 'Loading...' : 'Load more', variant: 'ghost', busy: loadingMore, attrs: 'data-load-more' })}
                </div>
              `
            : ''}
        </div>
      `;
    }

    renderHtml(
      outlet,
      html`
        <section style="display:grid;gap:var(--s5);margin:var(--s5) 0">
          <h1>Browse rentals</h1>
          <form class="card panel search-filters" role="search" data-search-form>
            ${field({ id: 'f-q', name: 'q', label: 'Keyword', value: filters.q, placeholder: 'Camera, tent, drill...' })}
            ${field({ id: 'f-cat', name: 'category', label: 'Category', type: 'select', value: filters.category, options: catOpts })}
            ${field({ id: 'f-city', name: 'city', label: 'City', value: filters.city, placeholder: 'Bengaluru, Pune...' })}
            ${field({ id: 'f-min', name: 'minRupees', type: 'number', label: 'Min ₹/day', value: filters.minPaise ? String(Math.round(filters.minPaise / 100)) : '' })}
            ${field({ id: 'f-max', name: 'maxRupees', type: 'number', label: 'Max ₹/day', value: filters.maxPaise ? String(Math.round(filters.maxPaise / 100)) : '' })}
            ${field({ id: 'f-start', name: 'startDate', type: 'date', label: 'From', value: filters.startDate })}
            ${field({ id: 'f-end', name: 'endDate', type: 'date', label: 'Until', value: filters.endDate })}
            ${field({ id: 'f-sort', name: 'sort', label: 'Sort', type: 'select', value: filters.sort, options: sortOpts })}
            <div style="display:flex;gap:var(--s2);align-items:end;flex-wrap:wrap">
              ${button({ label: 'Apply filters', type: 'submit' })}
              <a class="btn btn--ghost" href="#/search">Clear</a>
            </div>
          </form>
          ${bodyHtml}
        </section>
      `,
    );

    outlet.querySelector('[data-search-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(/** @type {HTMLFormElement} */ (e.currentTarget));
      const base = buildSearchHash(Object.fromEntries(fd.entries()));
      const target = isSampleMode ? `${base}${base.includes('?') ? '&' : '?'}sample=1` : base;
      ctx.navigate(target);
    });

    outlet.querySelector('[data-retry]')?.addEventListener('click', () => runSearch(false));
    outlet.querySelector('[data-load-more]')?.addEventListener('click', () => runSearch(true));
  }

  async function runSearch(loadMore) {
    if (isSampleMode) {
      loading = false;
      loadingMore = false;
      loadError = '';
      state = { items: filterListingsLocal([...SAMPLE_LISTINGS], filters), hasMore: false };
      paint();
      return;
    }
    if (loadMore) loadingMore = true;
    else loading = true;
    loadError = '';
    paint();
    try {
      state = await searchListings(ctx.query || {}, { loadMore });
    } catch (err) {
      loadError = err.message || 'Could not load search results.';
    } finally {
      loading = false;
      loadingMore = false;
      paint();
    }
  }

  runSearch(false);
}
