/**
 * Admin moderation and dispute resolution console (#/admin, guarded by requireAdmin) (M9.2-M9.5).
 */
import { html, renderHtml } from '../components/dom.js';
import { renderAdminDetailMarkup } from '../components/adminViewMarkup.js';
import { emptyState, errorState } from '../components/emptyState.js';
import { showToast } from '../components/toast.js';
import { chip } from '../components/ui.js';
import {
  getDisputeEvidence,
  listOpenReports,
  moderateReportedListing,
  resolveBookingDispute,
} from '../services/reports.js';
import { clearSearchCache } from '../services/search.js';

/**
 * Render Admin console.
 * @param {Element} outlet
 * @param {{ user: { uid: string }, profile?: { role?: string } }} ctx
 */
export async function render(outlet, ctx) {
  let reports = /** @type {any[]} */ ([]);
  let selectedId = '';
  let evidence = null;
  let loading = true;
  let loadingEvidence = false;
  let loadError = '';

  async function loadQueue() {
    loading = true;
    loadError = '';
    paint();
    try {
      reports = await listOpenReports();
      if (reports.length > 0 && !reports.some((r) => r.id === selectedId)) {
        await selectReport(reports[0]);
        return;
      }
    } catch (err) {
      loadError = err.message || 'Could not load admin queue.';
    } finally {
      loading = false;
      paint();
    }
  }

  async function selectReport(report) {
    selectedId = report.id;
    evidence = null;
    if (report.kind === 'dispute') {
      loadingEvidence = true;
      paint();
      try {
        evidence = await getDisputeEvidence(report);
      } catch (err) {
        showToast(err.message, { variant: 'error' });
      } finally {
        loadingEvidence = false;
      }
    }
    paint();
  }

  function paint() {
    if (loading) {
      renderHtml(outlet, html`<section class="card panel"><div class="skeleton" style="height:120px"></div></section>`);
      return;
    }
    if (loadError) {
      renderHtml(outlet, errorState({ title: 'Could not load admin queue', message: loadError }));
      outlet.querySelector('[data-retry]')?.addEventListener('click', loadQueue);
      return;
    }

    const activeReport = reports.find((r) => r.id === selectedId) || null;
    renderHtml(
      outlet,
      html`
        <section style="display:grid;gap:var(--s5);margin:var(--s5) 0">
          <div>
            <h1>Admin moderation &amp; disputes</h1>
            <p class="muted">Review open booking disputes and reported listings. Decisions require an audit note.</p>
          </div>

          ${reports.length === 0
            ? emptyState({
                title: 'No open reports or disputes',
                message: 'The moderation queue is clear.',
                actionLabel: 'Back to browse',
                actionHref: '#/search',
              })
            : html`
                <div class="booking">
                  <div style="display:grid;gap:var(--s3)" aria-label="Open reports queue">
                    ${reports.map(
                      (r) => html`
                        <button
                          type="button"
                          class="card panel"
                          style="text-align:left;cursor:pointer;${r.id === selectedId ? 'border-color:var(--cobalt);box-shadow:var(--lift)' : ''}"
                          data-select-report="${r.id}"
                        >
                          <div style="display:flex;justify-content:space-between;gap:var(--s2);align-items:center">
                            <strong>${r.listingTitle || r.bookingId || r.listingId}</strong>
                            ${chip(r.kind, r.kind === 'dispute' ? 'danger' : 'default')}
                          </div>
                          <span class="muted">${r.reason}</span>
                        </button>
                      `,
                    )}
                  </div>
                  <div>
                    ${loadingEvidence
                      ? html`<div class="card panel"><div class="skeleton" style="height:220px"></div></div>`
                      : renderAdminDetailMarkup({ report: activeReport, evidence })}
                  </div>
                </div>
              `}
        </section>
      `,
    );

    outlet.querySelectorAll('[data-select-report]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rep = reports.find((r) => r.id === btn.getAttribute('data-select-report'));
        if (rep) selectReport(rep);
      });
    });

    const disputeForm = /** @type {HTMLFormElement | null} */ (outlet.querySelector('[data-resolve-dispute-form]'));
    disputeForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitter = /** @type {HTMLButtonElement | null} */ (/** @type {SubmitEvent} */ (e).submitter);
      const action = /** @type {'release' | 'forfeit' | 'cancel'} */ (submitter?.getAttribute('data-dispute-action') || '');
      const note = String(new FormData(disputeForm).get('note') || '').trim();
      if (!activeReport || !evidence?.booking || !action) return;

      if (submitter) submitter.disabled = true;
      try {
        await resolveBookingDispute({
          report: activeReport,
          booking: evidence.booking,
          adminUid: ctx.user.uid,
          isAdmin: ctx.profile?.role === 'admin',
          action,
          note,
        });
        showToast('Dispute resolved', { variant: 'success' });
        selectedId = '';
        await loadQueue();
      } catch (err) {
        showToast(err.message, { variant: 'error' });
        if (submitter) submitter.disabled = false;
      }
    });

    const modForm = /** @type {HTMLFormElement | null} */ (outlet.querySelector('[data-mod-listing-form]'));
    modForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitter = /** @type {HTMLButtonElement | null} */ (/** @type {SubmitEvent} */ (e).submitter);
      const action = submitter?.getAttribute('data-mod-action') || '';
      const note = String(new FormData(modForm).get('note') || '').trim();
      if (!activeReport || !action) return;

      if (submitter) submitter.disabled = true;
      try {
        await moderateReportedListing({
          reportId: activeReport.id,
          listingId: activeReport.listingId,
          adminUid: ctx.user.uid,
          isAdmin: ctx.profile?.role === 'admin',
          action,
          note,
        });
        clearSearchCache();
        showToast(`Listing moderation applied (${action})`, { variant: 'success' });
        selectedId = '';
        await loadQueue();
      } catch (err) {
        showToast(err.message, { variant: 'error' });
        if (submitter) submitter.disabled = false;
      }
    });
  }

  loadQueue();
}
