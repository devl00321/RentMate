/**
 * Home view (rules/06 s5): headline, search bar, handover ribbon explainer, listings grid, deposit note.
 */
import { BOOKING_STATUS, CATEGORIES } from '../config/constants.js';
import { html, renderHtml } from '../components/dom.js';
import { field, skeletonCards } from '../components/ui.js';
import { emptyState, errorState } from '../components/emptyState.js';
import { listingCard } from '../components/listingCard.js';
import { ribbon } from '../components/ribbon.js';
import { buildSearchHash } from '../domain/search.js';
import { searchListings } from '../services/search.js';

/**
 * Render Home view (#/).
 * @param {Element} outlet
 * @param {{ navigate: (path: string) => void }} ctx
 */
export async function render(outlet, ctx) {
  const catOpts = [{ value: '', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))];

  function renderFrame(gridContent) {
    renderHtml(
      outlet,
      html`
        <section class="hero" aria-labelledby="hero-title">
          <h1 id="hero-title">Rent it for the weekend. Lend what you rarely use.</h1>
          <p>Verified people, agreed terms, and a deposit held until the item is back.</p>
          <form class="card card--raised search" role="search" data-home-search>
            ${field({ id: 'home-cat', name: 'category', label: 'What do you need?', type: 'select', options: catOpts })}
            ${field({ id: 'home-city', name: 'city', label: 'Where', placeholder: 'e.g. Bengaluru' })}
            ${field({ id: 'home-from', name: 'startDate', type: 'date', label: 'From' })}
            ${field({ id: 'home-to', name: 'endDate', type: 'date', label: 'Until' })}
            <button class="btn" type="submit">Search items</button>
          </form>
        </section>

        <section class="card story" aria-labelledby="story-title">
          <header>
            <h2 id="story-title">A rental, start to finish</h2>
            <span class="chip">Sample lifecycle</span>
          </header>
          ${ribbon({ status: BOOKING_STATUS.PAID })}
          <p class="muted">Both sides confirm pickup and return in the app with a photo of the item's condition.</p>
        </section>

        <div class="section-head">
          <h2>Available to rent</h2>
          <a href="#/search">Browse all</a>
        </div>
        <div data-home-grid>${gridContent}</div>

        <section class="card panel" style="margin-top:var(--s6)" aria-labelledby="deposit-how-title">
          <h2 id="deposit-how-title">How security deposits work</h2>
          <p>After an owner accepts your offer, the platform collects the rental fee plus a refundable security deposit before handover. Once the item is returned and the owner confirms its condition, the deposit is released back to you (Test mode: no real money moves).</p>
        </section>
      `,
    );

    outlet.querySelector('[data-home-search]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(/** @type {HTMLFormElement} */ (e.currentTarget));
      ctx.navigate(
        buildSearchHash({
          category: String(fd.get('category') || ''),
          city: String(fd.get('city') || ''),
          startDate: String(fd.get('startDate') || ''),
          endDate: String(fd.get('endDate') || ''),
        }),
      );
    });
  }

  renderFrame(skeletonCards(3));

  async function loadFeatured() {
    const slot = outlet.querySelector('[data-home-grid]');
    if (!slot) return;
    renderHtml(slot, skeletonCards(3));
    try {
      const res = await searchListings({});
      if (!res.items.length) {
        renderHtml(
          slot,
          emptyState({
            title: 'No listings published yet',
            message: 'Be the first to list an item or explore all filters.',
            actionLabel: 'List an item',
            actionHref: '#/list',
          }),
        );
        return;
      }
      renderHtml(slot, html`<div class="grid">${res.items.slice(0, 6).map((item) => listingCard(item))}</div>`);
    } catch (err) {
      renderHtml(slot, errorState({ title: 'Could not load listings', message: err.message }));
      slot.querySelector('[data-retry]')?.addEventListener('click', loadFeatured);
    }
  }

  loadFeatured();
}
