/**
 * Reusable listing card component (rules/06 s4): 70% photo, hang tag price, deposit, owner rating.
 */
import { formatPaise, html } from './dom.js';
import { priceTag } from './priceTag.js';
import { ratingStars } from './ratingStars.js';
import { verifiedBadge } from './verifiedBadge.js';

/**
 * Render a listing summary card linking to #/listing/:id (or static preview when no id).
 * @param {any} item
 * @param {{ preview?: boolean }} [opts]
 * @returns {ReturnType<typeof html>}
 */
export function listingCard(item, opts = {}) {
  const photo = Array.isArray(item.photos) && item.photos[0] ? item.photos[0] : '';
  const title = item.title || 'Untitled item';
  const city = item.city || 'City not set';
  const category = item.category || '';
  const dailyPaise = Number(item.dailyPaise) || 0;
  const depositPaise = Number(item.depositPaise) || 0;
  const href = !opts.preview && item.id ? `#/listing/${encodeURIComponent(item.id)}` : '';

  const inner = html`
    ${photo
      ? html`<img class="photo" src="${photo}" alt="${title} photo 1" width="400" height="300" loading="lazy">`
      : html`<div class="photo photo--placeholder" role="img" aria-label="No photo yet for ${title}">No photo added</div>`}
    <div class="listing__body">
      <div style="display:flex;justify-content:space-between;gap:var(--s2);align-items:start">
        <h3>${title}</h3>
        ${item.isSample ? html`<span class="chip">Sample</span>` : ''}
      </div>
      <div class="listing__meta">
        ${priceTag(dailyPaise, '/day')}
        <span class="muted">Deposit ${formatPaise(depositPaise)}</span>
      </div>
      <div class="owner">
        ${verifiedBadge(Boolean(item.ownerVerified))}
        <span>${item.ownerName || 'Owner'}</span>
        ${ratingStars(item.ownerRating || 0, item.ownerRatingCount || 0)}
      </div>
      <p class="muted" style="font-size:var(--fs-s)">${category ? `${category} · ` : ''}${city}</p>
    </div>
  `;

  if (href) {
    return html`<a class="card listing" href="${href}">${inner}</a>`;
  }
  return html`<article class="card listing">${inner}</article>`;
}
