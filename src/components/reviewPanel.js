/**
 * Two-way booking review form component (M8.4). Shown only when booking is Completed.
 */
import { BOOKING_STATUS, FIELD_LIMITS } from '../config/constants.js';
import { getMyReviewForBooking, submitBookingReview } from '../services/reviews.js';
import { html, renderHtml } from './dom.js';
import { ratingStars } from './ratingStars.js';
import { showToast } from './toast.js';
import { button, field } from './ui.js';

/**
 * Mount review panel into container if booking is Completed.
 * @param {Element} container
 * @param {{ booking: any, currentUid: string, currentName?: string }} opts
 */
export async function mountReviewPanel(container, { booking, currentUid, currentName }) {
  if (booking.status !== BOOKING_STATUS.COMPLETED) {
    renderHtml(container, html``);
    return;
  }

  let existing = await getMyReviewForBooking(booking.id, currentUid);

  function paint() {
    if (existing) {
      renderHtml(
        container,
        html`
          <section class="card panel" aria-label="Your review">
            <h2>Your review</h2>
            <div style="display:flex;gap:var(--s3);align-items:center">
              ${ratingStars(existing.rating, 1)}
              <span class="muted">Submitted (reviews cannot be edited)</span>
            </div>
            <p>${existing.text}</p>
          </section>
        `,
      );
      return;
    }

    const starOpts = [5, 4, 3, 2, 1].map((n) => ({
      value: String(n),
      label: `${n} star${n === 1 ? '' : 's'}`,
    }));

    renderHtml(
      container,
      html`
        <section class="card panel" aria-label="Leave a review">
          <h2>Rate your experience</h2>
          <p class="muted">Two-way ratings build trust across RentMate. One review per booking.</p>
          <form style="display:grid;gap:var(--s4)" data-review-form>
            ${field({ id: 'rev-rating', name: 'rating', label: 'Rating', type: 'select', value: '5', options: starOpts })}
            ${field({
              id: 'rev-text',
              name: 'text',
              label: 'Review comment',
              type: 'textarea',
              rows: 3,
              placeholder: 'How was communication, condition, and handover?',
              hint: `Max ${FIELD_LIMITS.REVIEW_MAX} characters`,
              required: true,
            })}
            <div>${button({ label: 'Submit review', type: 'submit', attrs: 'data-submit-review' })}</div>
          </form>
        </section>
      `,
    );

    const form = /** @type {HTMLFormElement | null} */ (container.querySelector('[data-review-form]'));
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const btn = /** @type {HTMLButtonElement | null} */ (container.querySelector('[data-submit-review]'));
      if (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
      }
      try {
        existing = await submitBookingReview({
          booking,
          authorUid: currentUid,
          authorName: currentName || 'Member',
          rating: Number(fd.get('rating')),
          text: String(fd.get('text') || ''),
        });
        showToast('Review submitted', { variant: 'success' });
        paint();
      } catch (err) {
        showToast(err.message, { variant: 'error' });
        if (btn) {
          btn.disabled = false;
          btn.removeAttribute('aria-busy');
        }
      }
    });
  }

  paint();
}
