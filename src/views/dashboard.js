/**
 * Dashboard view: Renting, Lending, and Listings tabs in one account (M2.6, M3.3, M5.6).
 */
import { LISTING_STATUS } from '../config/constants.js';
import { formatPaise, html, renderHtml } from '../components/dom.js';
import { chip } from '../components/ui.js';
import { emptyState, errorState } from '../components/emptyState.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { listOwnerListings, setListingStatus } from '../services/listings.js';
import { listMyBookings } from '../services/bookingQueries.js';
import { clearSearchCache } from '../services/search.js';

/**
 * Render unified owner/renter dashboard.
 * @param {Element} outlet
 * @param {{ user: { uid: string, name?: string | null } }} ctx
 */
export async function render(outlet, ctx) {
  let tab = /** @type {'renting' | 'lending' | 'listings'} */ ('renting');
  let items = /** @type {any[]} */ ([]);
  let loading = true;
  let loadError = '';

  async function loadTab() {
    loading = true;
    loadError = '';
    paint();
    try {
      if (tab === 'listings') items = await listOwnerListings(ctx.user.uid);
      else if (tab === 'renting') items = await listMyBookings(ctx.user.uid, 'renter');
      else items = await listMyBookings(ctx.user.uid, 'owner');
    } catch (err) {
      loadError = err.message || 'Could not load items.';
    } finally {
      loading = false;
      paint();
    }
  }

  function renderBookingRow(b) {
    const tone = b.status === 'Disputed' || b.status === 'Cancelled' ? 'danger' : b.status === 'Paid' || b.status === 'Completed' ? 'held' : 'default';
    return html`
      <article class="card panel" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:var(--s4)">
        <div style="display:grid;gap:var(--s1)">
          <div style="display:flex;gap:var(--s2);align-items:center;flex-wrap:wrap">
            <h3><a href="#/booking/${b.id}">${b.listingTitle || 'Booking'}</a></h3>
            ${chip(b.status, tone)}
          </div>
          <p class="muted">${b.startDate} → ${b.endDate} · Total ${formatPaise(b.amounts?.renterPays || 0)}</p>
        </div>
        <a class="btn btn--ghost" href="#/booking/${b.id}">Open booking</a>
      </article>
    `;
  }

  function renderBody() {
    if (loading) return html`<div class="card panel"><div class="skeleton" style="height:24px;width:45%"></div></div>`;
    if (loadError) return errorState({ title: 'Could not load dashboard', message: loadError });
    if (items.length === 0) {
      const copy = {
        renting: { title: 'No rentals yet', message: 'Items you request appear here.', actionLabel: 'Browse items', actionHref: '#/search' },
        lending: { title: 'No incoming requests yet', message: 'Requests from renters appear here.', actionLabel: 'List an item', actionHref: '#/list' },
        listings: { title: 'No items listed yet', message: 'List an idle item to earn from neighbors.', actionLabel: 'List an item', actionHref: '#/list' },
      }[tab];
      return emptyState(copy);
    }
    if (tab !== 'listings') {
      return html`<div style="display:grid;gap:var(--s3)">${items.map(renderBookingRow)}</div>`;
    }
    return html`
      <div style="display:grid;gap:var(--s3)">
        ${items.map(
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
    renderHtml(
      outlet,
      html`
        <section style="display:grid;gap:var(--s5);margin:var(--s5) 0">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:var(--s3)">
            <div>
              <h1>Dashboard</h1>
              <p class="muted">Signed in as ${ctx.user?.name || ctx.user?.uid}. One account for renting and lending.</p>
            </div>
            <a class="btn" href="#/list">List an item</a>
          </div>
          <div style="display:flex;gap:var(--s2);flex-wrap:wrap" role="tablist" aria-label="Dashboard sections">
            <button type="button" class="btn ${tab === 'renting' ? '' : 'btn--ghost'}" data-tab="renting">Renting</button>
            <button type="button" class="btn ${tab === 'lending' ? '' : 'btn--ghost'}" data-tab="lending">Lending</button>
            <button type="button" class="btn ${tab === 'listings' ? '' : 'btn--ghost'}" data-tab="listings">Listings</button>
          </div>
          ${renderBody()}
        </section>
      `,
    );

    outlet.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        tab = /** @type {any} */ (btn.getAttribute('data-tab'));
        loadTab();
      });
    });
    outlet.querySelector('[data-retry]')?.addEventListener('click', loadTab);
    outlet.querySelectorAll('[data-toggle-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-toggle-status') || '';
        const next = btn.getAttribute('data-current') === LISTING_STATUS.ACTIVE ? LISTING_STATUS.PAUSED : LISTING_STATUS.ACTIVE;
        btn.setAttribute('disabled', 'true');
        try {
          await setListingStatus(id, next);
          clearSearchCache();
          showToast(next === LISTING_STATUS.PAUSED ? 'Listing paused' : 'Listing resumed', { variant: 'success' });
          await loadTab();
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
          body: html`<p>Remove <strong>${title}</strong> from search results?</p>`,
          confirmLabel: 'Remove listing',
          danger: true,
          onConfirm: async () => {
            await setListingStatus(id, LISTING_STATUS.REMOVED);
            clearSearchCache();
            showToast('Listing removed', { variant: 'success' });
            await loadTab();
          },
        });
      });
    });
  }

  loadTab();
}
