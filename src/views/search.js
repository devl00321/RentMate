/**
 * Search view stub (full implementation in M4).
 */
import { html, renderHtml } from '../components/dom.js';

/**
 * Render search view into outlet.
 * @param {Element} outlet
 * @param {{ query: Record<string, string> }} ctx
 */
export function render(outlet, ctx) {
  renderHtml(
    outlet,
    html`
      <section class="panel card">
        <h1>Browse rentals</h1>
        <p class="muted">Search filters will appear here. Query: ${ctx.query.q || 'all items'}</p>
        <div><a class="btn btn--ghost" href="#/demo">View component demo</a></div>
      </section>
    `,
  );
}
