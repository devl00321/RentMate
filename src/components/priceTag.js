/**
 * Hang tag price component (signature element 2, rules/06 s1).
 */
import { formatPaise, html } from './dom.js';

/**
 * Render the marigold hang tag price badge.
 * @param {number} paise
 * @param {string} [unit]
 * @returns {ReturnType<typeof html>}
 */
export function priceTag(paise, unit = '/day') {
  return html`<span class="price-tag">${formatPaise(paise)}${unit ? html`<small>${unit}</small>` : ''}</span>`;
}
