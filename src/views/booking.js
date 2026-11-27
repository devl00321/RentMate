/**
 * Booking detail view (#/booking/:id): real-time booking sync, ribbon, chat, handover, review (M5-M8).
 */
import { html, renderHtml } from '../components/dom.js';
import { renderBookingMarkup } from '../components/bookingViewMarkup.js';
import { mountChatPanel } from '../components/chatPanel.js';
import { openCheckoutModal } from '../components/checkoutModal.js';
import { emptyState, errorState } from '../components/emptyState.js';
import { mountHandoverPanel } from '../components/handoverPanel.js';
import { openModal } from '../components/modal.js';
import { mountReviewPanel } from '../components/reviewPanel.js';
import { showToast } from '../components/toast.js';
import { resolveBookingActor } from '../domain/bookingOps.js';
import { acceptBooking, cancelBooking } from '../services/bookings.js';
import { listBookingEvents, watchBooking } from '../services/bookingQueries.js';
import { releaseDepositAndComplete } from '../services/handover.js';
import { processBookingPayment } from '../services/payments.js';

/**
 * Mount booking view and detach all real-time listeners on route exit.
 * @param {Element} outlet
 * @param {{ params: { id: string }, user: { uid: string, name?: string | null } }} ctx
 * @returns {Promise<() => void>}
 */
export async function render(outlet, ctx) {
  renderHtml(
    outlet,
    html`<section class="card panel" style="margin:var(--s5) 0" aria-busy="true"><div class="skeleton" style="height:120px"></div></section>`,
  );

  let currentBooking = null;
  let events = /** @type {any[]} */ ([]);
  let unsubBooking = null;
  let chatCtrl = null;

  async function refreshEvents() {
    try {
      events = await listBookingEvents(ctx.params.id);
    } catch {
      events = [];
    }
  }

  async function paint() {
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

    const chatSlot = outlet.querySelector('[data-chat-slot]');
    if (chatSlot) {
      if (!chatCtrl) {
        chatCtrl = await mountChatPanel(chatSlot, {
          booking: currentBooking,
          currentUid: ctx.user.uid,
          onBookingUpdated: refreshEvents,
        });
      } else {
        chatCtrl.setBooking(currentBooking);
        chatCtrl.mountTo(chatSlot);
      }
    }

    const handoverSlot = outlet.querySelector('[data-handover-slot]');
    if (handoverSlot) {
      mountHandoverPanel(handoverSlot, {
        booking: currentBooking,
        actor,
        currentUid: ctx.user.uid,
        onUpdated: refreshEvents,
      });
    }

    const reviewSlot = outlet.querySelector('[data-review-slot]');
    if (reviewSlot) {
      mountReviewPanel(reviewSlot, {
        booking: currentBooking,
        currentUid: ctx.user.uid,
        currentName: ctx.user.name || 'Member',
      });
    }

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
      } else if (action === 'pay') {
        openCheckoutModal({
          booking: currentBooking,
          onPay: async (outcome) => {
            await processBookingPayment({ booking: currentBooking, actorUid: ctx.user.uid, outcome });
            await refreshEvents();
            showToast('Payment confirmed (test mode)', { variant: 'success' });
          },
        });
      } else if (action === 'handover' || action === 'return') {
        const target = /** @type {HTMLElement | null} */ (outlet.querySelector('[data-handover-slot]'));
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        /** @type {HTMLElement | null} */ (target?.querySelector('input, button'))?.focus();
      } else if (action === 'release') {
        primaryBtn.disabled = true;
        primaryBtn.setAttribute('aria-busy', 'true');
        try {
          await releaseDepositAndComplete({ booking: currentBooking, actorUid: ctx.user.uid });
          await refreshEvents();
          showToast('Deposit released (test mode)', { variant: 'success' });
        } catch (err) {
          showToast(err.message, { variant: 'error' });
          primaryBtn.disabled = false;
          primaryBtn.removeAttribute('aria-busy');
        }
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
    unsubBooking = await watchBooking(
      ctx.params.id,
      async (docData) => {
        currentBooking = docData;
        await refreshEvents();
        await paint();
      },
      (err) => renderHtml(outlet, errorState({ title: 'Could not load booking', message: err.message })),
    );
  } catch (err) {
    renderHtml(outlet, errorState({ title: 'Could not load booking', message: err.message }));
  }

  return () => {
    unsubBooking?.();
    chatCtrl?.destroy();
  };
}
