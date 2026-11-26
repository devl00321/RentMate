/**
 * UI component state demo view (used in M1.4 & M1.5).
 */
import { html, renderHtml } from '../components/dom.js';

/**
 * Render component demo view.
 * @param {Element} outlet
 */
export function render(outlet) {
  renderHtml(
    outlet,
    html`
      <section class="panel card">
        <h1>Component &amp; status showcase</h1>
        <p class="muted">Demo route loaded lazily.</p>
      </section>
    `,
  );
}
