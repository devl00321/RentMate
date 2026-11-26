/**
 * Home view stub (full implementation in M4/M5).
 */
import { html, renderHtml } from '../components/dom.js';

/**
 * Render home view into outlet.
 * @param {Element} outlet
 */
export function render(outlet) {
  renderHtml(
    outlet,
    html`
      <section class="hero">
        <h1>Rent it for the weekend. Lend what you rarely use.</h1>
        <p>Verified people, agreed terms, and a deposit held until the item is back.</p>
        <div><a class="btn" href="#/search">Browse items</a></div>
      </section>
    `,
  );
}
