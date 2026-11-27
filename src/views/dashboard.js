/**
 * Dashboard view: Renting, Lending, and Owner Listings management (active/pause/remove) in one account.
 */
import { LISTING_STATUS } from '../config/constants.js';
import { formatPaise, html, renderHtml } from '../components/dom.js';
import { chip } from '../components/ui.js';
import { emptyState, errorState } from '../components/emptyState.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { listOwnerListings, setListingStatus } from '../services/listings.js';

/**
 * Render unified owner/renter dashboard.
 * @param {Element} outlet
 * @param {{ user: { uid: string, name?: string | null } }} ctx
 */
export async function render(outlet, ctx) {
  let tab = /** @type {'renting' | 'lending' | 'listings'} */ ('listings');
  let ownerListings = /** @type {any[]} */ ([]);
  let loading = false;
  let loadError = '';

  async function loadListings() {
    loading = true;
    loadError = '';
    paint();
    try {
      ownerListings = await listOwnerListings(ctx.user.uid);
    } catch (err) {
      loadError = err.message || 'Could not load your listings.';
    } finally {
      loading = false;
      paint();
    }
  }

  function renderListingsTab() {
    if (loading) {
      return html`<div class="card panel"><div class="skeleton" style="height:24px;width:40%"></div></div>`;
    }
    if (loadError) {
      return errorState({ title: 'Could not load listings', message: loadError });
    }
    if (ownerListings.length === 0) {
      return emptyState({
        title: 'You have not listed any items yet',
        message: 'List an idle camera, tool, or gear to earn from neighbors.',
        actionLabel: 'List an item',
        actionHref: '#/list',
      });
    }
    return html`
      <div style="display:grid;gap:var(--s3)">
        ${ownerListings.map(
          (item) => html`
            <article class="card panel" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:var(--s4)">
              <div style="display:grid;gap:var(--s1)">
                <div style="display:flex;gap:var(--s2);align-items:center;flex-wrap:wrap">
                  <h3><a href="#/listing/${item.id}">${item.title}</a></h3>
                  ${chip(item.status, item.status === 'active' ? 'held' : 'default')}
                </div>
                <p class="muted">${formatPaise(item.dailyPaise)}/day · Deposit ${formatPaise(item.depositPaise)} · ${item.city}</p>
              </div>
              <div style="display:flex;gap:var(--s2);flex-wrap:wrap">
                <a class="btn btn--ghost" href="#/list/${item.id}">Edit</a>
                <button type="button" class="btn btn--ghost" data-toggle-status="${item.id}" data-current="${item.status}">
                  ${item.status === LISTING_STATUS.ACTIVE ? 'Pause' : 'Resume'}
                </button>
                <button type="button" class="btn btn--danger" data-remove-listing="${item.id}" data-title="${item.title}">Remove</button>
              </div>
            </article>
          `,
        )}
      </div>
    `;
  }

  function paint() {
    let tabBody;
    if (tab === 'listings') {
      tabBody = renderListingsTab();
    } else if (tab === 'renting') {
      tabBody = emptyState({
        title: 'No rentals yet',
        message: 'Items you request or rent appear here.',
        actionLabel: 'Browse items',
        actionHref: '#/search',
      });
    } else {
      tabBody = emptyState({
        title: 'No incoming requests yet',
        message: 'Requests from renters on your items appear here.',
        actionLabel: 'List an item',
        actionHref: '#/list',
      });
    }

    renderHtml(
      outlet,
      html`
        <section style="display:grid;gap:var(--s5);margin:var(--s5) 0">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:var(--s3)">
            <div>
              <h1>Dashboard</h1>
              <p class="muted">Signed in as ${ctx.user?.name || ctx.user?.uid}. Use one account for renting and lending.</p>
            </div>
            <a class="btn" href="#/list">List an item</a>
          </div>
          <div style="display:flex;gap:var(--s2);flex-wrap:wrap" role="tablist" aria-label="Dashboard sections">
            <button type="button" class="btn ${tab === 'renting' ? '' : 'btn--ghost'}" data-tab="renting">Renting</button>
            <button type="button" class="btn ${tab === 'lending' ? '' : 'btn--ghost'}" data-tab="lending">Lending</button>
            <button type="button" class="btn ${tab === 'listings' ? '' : 'btn--ghost'}" data-tab="listings">Listings</button>
          </div>
          ${tabBody}
        </section>
      `,
    );

    outlet.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        tab = /** @type {any} */ (btn.getAttribute('data-tab'));
        if (tab === 'listings') loadListings();
        else paint();
      });
    });

    outlet.querySelector('[data-retry]')?.addEventListener('click', loadListings);

    outlet.querySelectorAll('[data-toggle-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-toggle-status') || '';
        const current = btn.getAttribute('data-current');
        const next = current === LISTING_STATUS.ACTIVE ? LISTING_STATUS.PAUSED : LISTING_STATUS.ACTIVE;
        btn.setAttribute('disabled', 'true');
        try {
          await setListingStatus(id, next);
          showToast(next === LISTING_STATUS.PAUSED ? 'Listing paused' : 'Listing resumed', { variant: 'success' });
          await loadListings();
        } catch (err) {
          showToast(err.message, { variant: 'error' });
          btn.removeAttribute('disabled');
        }
      });
    });

    outlet.querySelectorAll('[data-remove-listing]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-remove-listing') || '';
        const title = btn.getAttribute('data-title') || 'this listing';
        openModal({
          title: 'Remove listing',
          body: html`<p>Remove <strong>${title}</strong> from search results? Existing bookings remain visible.</p>`,
          confirmLabel: 'Remove listing',
          danger: true,
          onConfirm: async () => {
            await setListingStatus(id, LISTING_STATUS.REMOVED);
            showToast('Listing removed', { variant: 'success' });
            await loadListings();
          },
        });
      });
    });
  }

  loadListings();
}
