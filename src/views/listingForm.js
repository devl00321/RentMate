/**
 * Listing creation/edit form stub (full implementation in M3.2).
 */
import { html, renderHtml } from '../components/dom.js';

/**
 * Render listing form stub.
 * @param {Element} outlet
 */
export function render(outlet) {
  renderHtml(
    outlet,
    html`
      <section class="card panel" style="margin:var(--s5) 0">
        <h1>List an item</h1>
        <p class="muted">The 4-step listing editor will be built in Milestone M3.</p>
        <div><a class="btn btn--ghost" href="#/dashboard">Back to dashboard</a></div>
      </section>
    `,
  );
}
