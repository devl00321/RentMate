/**
 * Dashboard view stub (full implementation in M5/M8): shows Renting, Lending, and Listings tabs in one account.
 */
import { html, renderHtml } from '../components/dom.js';
import { emptyState } from '../components/emptyState.js';

/**
 * Render unified owner/renter dashboard.
 * @param {Element} outlet
 * @param {{ user?: { uid: string, name?: string | null } | null }} ctx
 */
export function render(outlet, ctx) {
  let tab = /** @type {'renting' | 'lending' | 'listings'} */ ('renting');

  function paint() {
    const emptyCopy = {
      renting: {
        title: 'No rentals yet',
        message: 'Items you request or rent appear here.',
        actionLabel: 'Browse items',
        actionHref: '#/search',
      },
      lending: {
        title: 'No incoming requests yet',
        message: 'Requests from renters on your items appear here.',
        actionLabel: 'List an item',
        actionHref: '#/list',
      },
      listings: {
        title: 'You have not listed any items yet',
        message: 'List an idle camera, tool, or gear to earn from neighbors.',
        actionLabel: 'List an item',
        actionHref: '#/list',
      },
    }[tab];

    renderHtml(
      outlet,
      html`
        <section style="display:grid;gap:var(--s5);margin:var(--s5) 0">
          <div>
            <h1>Dashboard</h1>
            <p class="muted">Signed in as ${ctx.user?.name || ctx.user?.uid}. Use one account for renting and lending.</p>
          </div>
          <div style="display:flex;gap:var(--s2);flex-wrap:wrap" role="tablist" aria-label="Dashboard sections">
            <button type="button" class="btn ${tab === 'renting' ? '' : 'btn--ghost'}" data-tab="renting">Renting</button>
            <button type="button" class="btn ${tab === 'lending' ? '' : 'btn--ghost'}" data-tab="lending">Lending</button>
            <button type="button" class="btn ${tab === 'listings' ? '' : 'btn--ghost'}" data-tab="listings">Listings</button>
          </div>
          ${emptyState(emptyCopy)}
        </section>
      `,
    );

    outlet.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        tab = /** @type {any} */ (btn.getAttribute('data-tab'));
        paint();
      });
    });
  }

  paint();
}
