/**
 * Stateful real-time chat controller mounted inside booking view (M6.1-M6.5).
 */
import { rupeesToPaise } from '../domain/listing.js';
import { resolveBookingActor } from '../domain/bookingOps.js';
import {
  acceptOfferInChat,
  sendOfferMessage,
  sendTextMessage,
  watchChatMessages,
} from '../services/chat.js';
import { renderChatMarkup } from './chatMarkup.js';
import { renderHtml } from './dom.js';
import { showToast } from './toast.js';

/**
 * Mount real-time chat panel into container and return controller with `destroy()` & `setBooking()`.
 * @param {Element} container
 * @param {{ booking: any, currentUid: string, onBookingUpdated?: () => void }} opts
 */
export async function mountChatPanel(container, opts) {
  let booking = opts.booking;
  let messages = /** @type {any[]} */ ([]);
  let showOfferForm = false;
  let chatError = '';
  let destroyed = false;

  function paint() {
    if (destroyed || !document.body.contains(container)) return;
    const actor = resolveBookingActor(booking, opts.currentUid);
    renderHtml(
      container,
      renderChatMarkup({
        booking,
        messages,
        currentUid: opts.currentUid,
        actor,
        showOfferForm,
        error: chatError,
      }),
    );

    const listEl = container.querySelector('[data-chat-list]');
    if (listEl) listEl.scrollTop = listEl.scrollHeight;

    container.querySelectorAll('[data-toggle-offer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        showOfferForm = !showOfferForm;
        chatError = '';
        paint();
      });
    });

    const msgForm = /** @type {HTMLFormElement | null} */ (container.querySelector('[data-chat-form]'));
    msgForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = /** @type {HTMLInputElement} */ (msgForm.querySelector('#chat-text'));
      const btn = /** @type {HTMLButtonElement | null} */ (msgForm.querySelector('[data-send-msg]'));
      const text = input.value;
      if (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
      }
      chatError = '';
      try {
        await sendTextMessage({ booking, senderUid: opts.currentUid, text });
        input.value = '';
      } catch (err) {
        chatError = err.message;
        paint();
      } finally {
        if (btn && document.body.contains(btn)) {
          btn.disabled = false;
          btn.removeAttribute('aria-busy');
        }
      }
    });

    const offerForm = /** @type {HTMLFormElement | null} */ (container.querySelector('[data-offer-form]'));
    offerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(offerForm);
      const btn = /** @type {HTMLButtonElement | null} */ (offerForm.querySelector('[data-send-offer]'));
      if (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
      }
      chatError = '';
      try {
        await sendOfferMessage({
          booking,
          senderUid: opts.currentUid,
          offer: {
            dailyPaise: rupeesToPaise(String(fd.get('dailyRupees') || 0)),
            depositPaise: rupeesToPaise(String(fd.get('depositRupees') || 0)),
            pickupTime: String(fd.get('pickupTime') || '').trim(),
          },
        });
        showOfferForm = false;
        showToast('Offer sent', { variant: 'success' });
      } catch (err) {
        chatError = err.message;
        paint();
      } finally {
        if (btn && document.body.contains(btn)) {
          btn.disabled = false;
          btn.removeAttribute('aria-busy');
        }
      }
    });

    container.querySelectorAll('[data-accept-offer]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const msgId = btn.getAttribute('data-accept-offer');
        const msg = messages.find((m) => m.id === msgId);
        if (!msg?.offer) return;
        const senderRole = msg.senderId === booking.ownerId ? 'owner' : 'renter';
        btn.setAttribute('disabled', 'true');
        btn.setAttribute('aria-busy', 'true');
        try {
          await acceptOfferInChat({
            booking,
            offer: msg.offer,
            offerSenderRole: senderRole,
            actorUid: opts.currentUid,
          });
          showToast('Offer accepted — dates locked', { variant: 'success' });
          opts.onBookingUpdated?.();
        } catch (err) {
          chatError = err.message;
          paint();
        }
      });
    });
  }

  let unsub = () => {};
  try {
    unsub = await watchChatMessages(
      booking.id,
      (nextMsgs) => {
        messages = nextMsgs;
        paint();
      },
      (err) => {
        chatError = err.message;
        paint();
      },
    );
  } catch (err) {
    chatError = err.message || 'Could not connect chat.';
    paint();
  }

  return {
    setBooking(next) {
      booking = next;
      paint();
    },
    mountTo(nextContainer) {
      container = nextContainer;
      paint();
    },
    destroy() {
      destroyed = true;
      unsub();
    },
  };
}
