/**
 * Listing detail view: keyboard-accessible gallery, calendar, price breakdown, and request dates (M3.4, M5.6).
 */
import { formatPaise, html, renderHtml } from '../components/dom.js';
import { mountCalendar } from '../components/calendar.js';
import { emptyState, errorState } from '../components/emptyState.js';
import { renderListingDetailMarkup } from '../components/listingDetailView.js';
import { showToast } from '../components/toast.js';
import { openReasonModal } from '../components/reportModal.js';
import { calculateBookingPricing } from '../domain/pricing.js';
import { getListing } from '../services/listings.js';
import { createBookingRequest } from '../services/bookings.js';
import { getBookedDaysForListing } from '../services/bookingQueries.js';
import { submitListingReport } from '../services/reports.js';
import { clearSearchCache } from '../services/search.js';

/**
 * Mount listing detail screen (#/listing/:id).
 * @param {Element} outlet
 * @param {{ params: { id: string }, user?: { uid: string, name?: string | null } | null, navigate: (p: string) => void }} ctx
 */
export async function render(outlet, ctx) {
  renderHtml(
    outlet,
    html`
      <section class="card panel" style="margin:var(--s5) 0" aria-busy="true">
        <div class="skeleton" style="aspect-ratio:16/9;max-height:360px"></div>
        <div class="skeleton" style="height:28px;width:55%"></div>
      </section>
    `,
  );

  let item = null;
  let bookedDays = /** @type {string[]} */ ([]);
  let loadError = '';

  async function load() {
    loadError = '';
    try {
      item = await getListing(ctx.params.id);
      if (item) bookedDays = await getBookedDaysForListing(item.id);
    } catch (err) {
      loadError = err.message || 'Could not load listing.';
    }
  }

  await load();

  let activeIndex = 0;
  let selected = { startDate: '', endDate: '', days: 0 };

  function paintPricePreview() {
    const slot = outlet.querySelector('[data-price-preview]');
    if (!slot || !item) return;
    if (!selected.startDate || !selected.endDate || selected.days < 1) {
      renderHtml(slot, html`<p class="muted">Select pickup and return dates on the calendar above.</p>`);
      return;
    }
    const p = calculateBookingPricing({
      dailyPaise: item.dailyPaise,
      depositPaise: item.depositPaise,
      days: selected.days,
    });
    renderHtml(
      slot,
      html`
        <dl class="rows">
          <div><dt>Rental, ${formatPaise(p.dailyPaise)} × ${p.days}d</dt><dd>${formatPaise(p.rental)}</dd></div>
          <div><dt>Service fee (5% PLACEHOLDER)</dt><dd>${formatPaise(p.fee)}</dd></div>
          <div><dt>Refundable deposit</dt><dd>${formatPaise(p.deposit)}</dd></div>
          <div class="total"><dt>Total on confirmation</dt><dd>${formatPaise(p.renterPays)}</dd></div>
        </dl>
      `,
    );
  }

  function paint() {
    if (loadError) {
      renderHtml(outlet, errorState({ title: 'Could not load listing', message: loadError }));
      outlet.querySelector('[data-retry]')?.addEventListener('click', async () => {
        await load();
        paint();
      });
      return;
    }

    if (!item || item.status === 'removed') {
      renderHtml(
        outlet,
        emptyState({
          title: 'Listing not found',
          message: 'This item is no longer available.',
          actionLabel: 'Browse items',
          actionHref: '#/search',
        }),
      );
      return;
    }

    const isOwner = Boolean(ctx.user?.uid && ctx.user.uid === item.ownerId);
    renderHtml(outlet, renderListingDetailMarkup(item, { activeIndex, isOwner }));

    outlet.querySelectorAll('[data-gallery-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeIndex = Number(btn.getAttribute('data-gallery-idx'));
        paint();
      });
    });

    const total = item.photos?.length || 0;
    outlet.querySelector('[data-gallery-prev]')?.addEventListener('click', () => {
      if (total > 1) {
        activeIndex = (activeIndex - 1 + total) % total;
        paint();
      }
    });
    outlet.querySelector('[data-gallery-next]')?.addEventListener('click', () => {
      if (total > 1) {
        activeIndex = (activeIndex + 1) % total;
        paint();
      }
    });

    const calSlot = outlet.querySelector('[data-calendar-slot]');
    if (calSlot && !isOwner) {
      mountCalendar(calSlot, {
        availability: item.availability,
        bookedDays,
        startDate: selected.startDate,
        endDate: selected.endDate,
        onChange: (sel) => {
          selected = sel;
          paintPricePreview();
        },
      });
      paintPricePreview();
    }

    outlet.querySelector('[data-request-dates]')?.addEventListener('click', async (e) => {
      if (!ctx.user?.uid) {
        ctx.navigate(`/auth?next=${encodeURIComponent(`/listing/${item.id}`)}`);
        return;
      }
      if (!selected.startDate || !selected.endDate || selected.days < 1) {
        showToast('Select pickup and return dates on the calendar first.', { variant: 'error' });
        return;
      }
      const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      try {
        const created = await createBookingRequest({
          listing: item,
          renter: ctx.user,
          startDate: selected.startDate,
          endDate: selected.endDate,
        });
        clearSearchCache();
        showToast('Request sent', { variant: 'success' });
        ctx.navigate(`/booking/${created.id}`);
      } catch (err) {
        showToast(err.message, { variant: 'error' });
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
    });

    outlet.querySelector('[data-report-listing]')?.addEventListener('click', () => {
      if (!ctx.user?.uid) {
        ctx.navigate(`/auth?next=${encodeURIComponent(`/listing/${item.id}`)}`);
        return;
      }
      openReasonModal({
        title: 'Report listing',
        intro: 'Tell moderators what is wrong with this listing (e.g. misleading photos or safety concern).',
        submitLabel: 'Submit report',
        onSubmit: async (reason) => {
          await submitListingReport({ listing: item, reporterUid: ctx.user.uid, reason });
          showToast('Report submitted for admin review', { variant: 'success' });
        },
      });
    });
  }

  paint();
}
