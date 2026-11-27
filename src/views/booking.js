/**
 * Booking detail view (#/booking/:id): real-time booking sync, ribbon, price breakdown, actions (M5.6).
 */
import { html, renderHtml } from '../components/dom.js';
import { renderBookingMarkup } from '../components/bookingViewMarkup.js';
import { emptyState, errorState } from '../components/emptyState.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { resolveBookingActor } from '../domain/bookingOps.js';
import { acceptBooking, cancelBooking } from '../services/bookings.js';
import { listBookingEvents, watchBooking } from '../services/bookingQueries.js';

/**
 * Mount booking view and detach real-time listener on route exit.
 * @param {Element} outlet
 * @param {{ params: { id: string }, user: { uid: string } }} ctx
 * @returns {Promise<() => void>}
 */
export async function render(outlet, ctx) {
  renderHtml(
    outlet,
    html`<section class="card panel" style="margin:var(--s5) 0" aria-busy="true"><div class="skeleton" style="height:120px"></div></section>`,
  );

  let currentBooking = null;
  let events = /** @type {any[]} */ ([]);
  let unsub = null;

  async function refreshEvents() {
    try {
      events = await listBookingEvents(ctx.params.id);
    } catch {
      events = [];
    }
  }

  function paint() {
    if (!currentBooking) {
      renderHtml(
        outlet,
        emptyState({
          title: 'Booking not found',
          message: 'This booking may not exist or you do not have access.',
          actionLabel: 'Back to dashboard',
          actionHref: '#/dashboard',
        }),
      );
      return;
    }

    const actor = resolveBookingActor(currentBooking, ctx.user.uid);
    renderHtml(outlet, renderBookingMarkup(currentBooking, { actor, events }));

    const primaryBtn = /** @type {HTMLButtonElement | null} */ (outlet.querySelector('[data-booking-action]'));
    primaryBtn?.addEventListener('click', async () => {
      const action = primaryBtn.getAttribute('data-booking-action');
      if (action === 'accept') {
        primaryBtn.disabled = true;
        primaryBtn.setAttribute('aria-busy', 'true');
        try {
          await acceptBooking(currentBooking.id, ctx.user.uid);
          await refreshEvents();
          showToast('Booking accepted', { variant: 'success' });
        } catch (err) {
          showToast(err.message, { variant: 'error' });
          primaryBtn.disabled = false;
          primaryBtn.removeAttribute('aria-busy');
        }
      } else {
        showToast(`Action "${action}" will be wired in M7/M8.`, { variant: 'info' });
      }
    });

    outlet.querySelector('[data-cancel-booking]')?.addEventListener('click', () => {
      openModal({
        title: 'Cancel booking',
        body: html`<p>Cancel this booking and release any reserved dates? (Test mode: full refund if Paid.)</p>`,
        confirmLabel: 'Cancel booking',
        danger: true,
        onConfirm: async () => {
          await cancelBooking(currentBooking.id, ctx.user.uid, 'Cancelled by user');
          await refreshEvents();
          showToast('Booking cancelled', { variant: 'success' });
        },
      });
    });

    outlet.querySelector('[data-open-dispute]')?.addEventListener('click', () => {
      showToast('Dispute filing will be wired in Milestone M9.', { variant: 'info' });
    });
  }

  try {
    await refreshEvents();
    unsub = await watchBooking(
      ctx.params.id,
      async (docData) => {
        currentBooking = docData;
        await refreshEvents();
        paint();
      },
      (err) => {
        renderHtml(outlet, errorState({ title: 'Could not load booking', message: err.message }));
      },
    );
  } catch (err) {
    renderHtml(outlet, errorState({ title: 'Could not load booking', message: err.message }));
  }

  return () => {
    if (typeof unsub === 'function') unsub();
  };
}
