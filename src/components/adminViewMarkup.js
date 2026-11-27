/**
 * Pure admin moderation & dispute evidence markup builder (M9.3-M9.5).
 */
import { formatPaise, html } from './dom.js';
import { button, chip, field } from './ui.js';

/**
 * Render admin evidence and decision form for a selected report.
 * @param {{ report: any, evidence: { booking?: any, messages?: any[], events?: any[] } | null }} opts
 */
export function renderAdminDetailMarkup({ report, evidence }) {
  if (!report) {
    return html`<div class="card panel"><p class="muted">Select an open report or dispute from the queue to review evidence.</p></div>`;
  }

  if (report.kind === 'listing') {
    return html`
      <div class="card panel" style="display:grid;gap:var(--s4)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--s2);flex-wrap:wrap">
          <h2>Reported listing: ${report.listingTitle || report.listingId}</h2>
          ${chip('Listing report', 'danger')}
        </div>
        <p><strong>Reason:</strong> ${report.reason}</p>
        <p class="muted"><a href="#/listing/${report.listingId}">Inspect listing</a> · Owner UID: ${report.ownerId || 'unknown'}</p>
        <form style="display:grid;gap:var(--s3);border-top:1px solid var(--mist);padding-top:var(--s3)" data-mod-listing-form>
          ${field({ id: 'mod-note', name: 'note', type: 'textarea', rows: 3, label: 'Admin moderation note (required)', required: true })}
          <div style="display:flex;gap:var(--s2);flex-wrap:wrap">
            ${button({ label: 'Pause listing', type: 'submit', variant: 'ghost', attrs: 'data-mod-action="paused"' })}
            ${button({ label: 'Remove listing', type: 'submit', variant: 'danger', attrs: 'data-mod-action="removed"' })}
            ${button({ label: 'Dismiss report', type: 'submit', variant: 'ghost', attrs: 'data-mod-action="dismiss"' })}
          </div>
        </form>
      </div>
    `;
  }

  const bk = evidence?.booking;
  const msgs = evidence?.messages || [];
  const evs = evidence?.events || [];
  const cond = bk?.confirmations || {};

  return html`
    <div class="card panel" style="display:grid;gap:var(--s4)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--s2);flex-wrap:wrap">
        <h2>Dispute: ${report.listingTitle || report.bookingId}</h2>
        ${chip('Dispute', 'danger')}
      </div>
      <p><strong>Reported reason:</strong> ${report.reason}</p>

      ${bk
        ? html`
            <dl class="rows">
              <div><dt>Dates</dt><dd>${bk.startDate} → ${bk.endDate}</dd></div>
              <div><dt>Deposit held</dt><dd>${formatPaise(bk.amounts?.deposit || 0)} (${bk.depositState})</dd></div>
              <div><dt>Total paid</dt><dd>${formatPaise(bk.amounts?.renterPays || 0)}</dd></div>
            </dl>
          `
        : html`<p class="muted">Booking record unavailable.</p>`}

      <section style="display:grid;gap:var(--s2)">
        <h3>Condition photos</h3>
        <div style="display:flex;gap:var(--s3);flex-wrap:wrap">
          ${cond.handoverPhotoUrl
            ? html`<figure style="margin:0"><img src="${cond.handoverPhotoUrl}" alt="Pickup condition photo" width="160" height="120" style="border-radius:var(--r-tag);object-fit:cover"><figcaption class="muted">Pickup</figcaption></figure>`
            : html`<span class="muted">No pickup photo</span>`}
          ${cond.returnPhotoUrl
            ? html`<figure style="margin:0"><img src="${cond.returnPhotoUrl}" alt="Return condition photo" width="160" height="120" style="border-radius:var(--r-tag);object-fit:cover"><figcaption class="muted">Return</figcaption></figure>`
            : html`<span class="muted">No return photo</span>`}
        </div>
      </section>

      <section style="display:grid;gap:var(--s2)">
        <h3>Chat transcript (${msgs.length})</h3>
        <div class="chat chat-stream" style="max-height:220px;border:1px solid var(--mist);border-radius:var(--r-ctl);padding:var(--s3)">
          ${msgs.length
            ? msgs.map((m) => html`<p class="muted"><strong>${m.type}:</strong> ${m.text}</p>`)
            : html`<p class="muted">No chat messages.</p>`}
        </div>
      </section>

      <section style="display:grid;gap:var(--s2)">
        <h3>Booking event trail (${evs.length})</h3>
        <ul style="list-style:none;margin:0;padding:0;display:grid;gap:var(--s1)">
          ${evs.map((e) => html`<li class="muted"><strong>${e.from} → ${e.to}</strong>${e.note ? `: ${e.note}` : ''}</li>`)}
        </ul>
      </section>

      ${bk
        ? html`
            <form style="display:grid;gap:var(--s3);border-top:1px solid var(--mist);padding-top:var(--s3)" data-resolve-dispute-form>
              <p class="note">Test mode: release/refund calls simulated payment adapter.</p>
              ${field({ id: 'adm-note', name: 'note', type: 'textarea', rows: 3, label: 'Admin decision note (required)', required: true })}
              <div style="display:flex;gap:var(--s2);flex-wrap:wrap">
                ${button({ label: 'Release deposit to renter', type: 'submit', attrs: 'data-dispute-action="release"' })}
                ${button({ label: 'Forfeit deposit to owner', type: 'submit', variant: 'danger', attrs: 'data-dispute-action="forfeit"' })}
                ${button({ label: 'Cancel & refund all', type: 'submit', variant: 'ghost', attrs: 'data-dispute-action="cancel"' })}
              </div>
            </form>
          `
        : ''}
    </div>
  `;
}
