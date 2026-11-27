/**
 * Pure listing detail markup builder (components/ layer, zero Firebase imports).
 */
import { formatPaise, html } from './dom.js';
import { button, chip } from './ui.js';
import { priceTag } from './priceTag.js';
import { ratingStars } from './ratingStars.js';
import { verifiedBadge } from './verifiedBadge.js';

/**
 * Render listing detail view markup.
 * @param {any} item
 * @param {{ activeIndex?: number, isOwner?: boolean }} [state]
 */
export function renderListingDetailMarkup(item, { activeIndex = 0, isOwner = false } = {}) {
  const photos = item.photos?.length ? item.photos : [];
  const safeIdx = Math.max(0, Math.min(activeIndex, Math.max(0, photos.length - 1)));
  const activePhoto = photos[safeIdx] || '';

  return html`
    <section style="display:grid;gap:var(--s5);margin:var(--s5) 0">
      <nav aria-label="Breadcrumb" class="muted">
        <a href="#/search">Browse</a> / <span>${item.category || 'Item'}</span>
      </nav>

      <div class="booking">
        <div style="display:grid;gap:var(--s5)">
          <div class="card gallery" aria-label="Item photos">
            ${activePhoto
              ? html`<img class="gallery__main" src="${activePhoto}" alt="${item.title} photo ${safeIdx + 1}" width="800" height="600">`
              : html`<div class="photo photo--placeholder">No photo available</div>`}
            ${photos.length > 1
              ? html`
                  <div class="gallery__bar">
                    <div style="display:flex;gap:var(--s2);flex-wrap:wrap">
                      ${photos.map(
                        (url, i) => html`
                          <button
                            type="button"
                            class="gallery__thumb${i === safeIdx ? ' is-active' : ''}"
                            data-gallery-idx="${i}"
                            aria-label="View photo ${i + 1} of ${photos.length}"
                            aria-pressed="${String(i === safeIdx)}"
                          >
                            <img src="${url}" alt="${item.title} thumbnail ${i + 1}" width="72" height="54" loading="lazy">
                          </button>
                        `,
                      )}
                    </div>
                    <div style="display:flex;gap:var(--s2)">
                      <button type="button" class="btn btn--ghost" data-gallery-prev aria-label="Previous photo">Prev</button>
                      <button type="button" class="btn btn--ghost" data-gallery-next aria-label="Next photo">Next</button>
                    </div>
                  </div>
                `
              : ''}
          </div>

          <div class="card panel">
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:var(--s3);align-items:start">
              <div style="display:grid;gap:var(--s2)">
                <div style="display:flex;gap:var(--s2);flex-wrap:wrap;align-items:center">
                  ${chip(item.category || 'Item')}
                  ${item.isSample ? chip('Sample content') : ''}
                </div>
                <h1>${item.title}</h1>
                <p class="muted">${item.city} · Exact pickup address shared after Paid</p>
              </div>
              ${priceTag(item.dailyPaise, '/day')}
            </div>

            <p>${item.description}</p>

            <div style="border-top:1px solid var(--mist);padding-top:var(--s4);display:grid;gap:var(--s2)">
              <h2>Owner</h2>
              <div class="owner" style="flex-wrap:wrap">
                <a href="#/profile/${item.ownerId}" style="font-weight:600">${item.ownerName}</a>
                ${verifiedBadge(Boolean(item.ownerVerified))}
                ${ratingStars(item.ownerRating || 0, item.ownerRatingCount || 0)}
              </div>
            </div>

            <div style="border-top:1px solid var(--mist);padding-top:var(--s4);display:grid;gap:var(--s2)">
              <h2>Available windows</h2>
              ${item.availability?.length
                ? html`
                    <ul style="list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:var(--s2)">
                      ${item.availability.map(
                        (r) => html`<li class="chip">${r.start} → ${r.end}</li>`,
                      )}
                    </ul>
                  `
                : html`<p class="muted">No availability windows published.</p>`}
            </div>
          </div>
        </div>

        <aside class="card card--raised panel sticky-panel" aria-label="Request dates">
          <h2>Rental summary</h2>
          <dl class="rows">
            <div><dt>Daily rate</dt><dd>${formatPaise(item.dailyPaise)}</dd></div>
            <div><dt>Refundable deposit</dt><dd>${formatPaise(item.depositPaise)}</dd></div>
          </dl>
          <p class="note">Test mode: no real money moves. Deposit is held until return is confirmed.</p>
          ${isOwner
            ? html`
                <div style="display:grid;gap:var(--s2)">
                  <a class="btn" href="#/list/${item.id}">Edit listing</a>
                  <a class="btn btn--ghost" href="#/dashboard">Manage in dashboard</a>
                </div>
              `
            : html`
                <div data-calendar-slot></div>
                <div data-price-preview></div>
                <button type="button" class="btn" data-request-dates>Request dates</button>
                <button type="button" class="btn btn--ghost" data-report-listing>Report listing</button>
              `}
        </aside>
      </div>
    </section>
  `;
}
