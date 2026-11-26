/**
 * Accessible star rating and review count component.
 */
import { html } from './dom.js';

/**
 * Render rating stars with numerical average and review count.
 * @param {number} avg
 * @param {number} count
 * @returns {ReturnType<typeof html>}
 */
export function ratingStars(avg, count = 0) {
  if (!count || count <= 0) {
    return html`<span class="chip">New member</span>`;
  }
  const clamped = Math.max(0, Math.min(5, Number(avg) || 0));
  const rounded = Math.round(clamped);
  const starsText = '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
  const label = `Rated ${clamped.toFixed(1)} out of 5 from ${count} review${count === 1 ? '' : 's'}`;

  return html`
    <span class="owner" aria-label="${label}">
      <span class="stars" aria-hidden="true">${starsText}</span>
      <span>${clamped.toFixed(1)} (${count})</span>
    </span>
  `;
}
