/**
 * Reusable reason input modal for listing reports and booking disputes (M9.1).
 */
import { FIELD_LIMITS } from '../config/constants.js';
import { validateModerationText } from '../domain/reportsOps.js';
import { html, renderHtml } from './dom.js';
import { button, field } from './ui.js';

/**
 * Open a modal asking for a required reason (5..500 chars) and submit via `onSubmit`.
 * @param {{ title: string, intro: string, submitLabel: string, onSubmit: (reason: string) => Promise<void> }} opts
 */
export function openReasonModal({ title, intro, submitLabel, onSubmit }) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let reason = '';
  let error = '';
  let busy = false;

  function close() {
    document.removeEventListener('keydown', onKeyDown);
    modalRoot.innerHTML = '';
    previousFocus?.focus();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && !busy) close();
  }
  document.addEventListener('keydown', onKeyDown);

  function paint() {
    renderHtml(
      modalRoot,
      html`
        <div class="modal-backdrop" data-rep-backdrop>
          <div class="card modal" role="dialog" aria-modal="true" aria-labelledby="rep-modal-title">
            <div class="modal__head">
              <h2 id="rep-modal-title">${title}</h2>
              <button type="button" class="btn btn--ghost" data-rep-close ${busy ? 'disabled' : ''}>Close</button>
            </div>
            <p class="muted">${intro}</p>
            <form style="display:grid;gap:var(--s3)" data-rep-form novalidate>
              ${field({
                id: 'rep-reason',
                name: 'reason',
                type: 'textarea',
                rows: 4,
                label: 'Reason',
                value: reason,
                error,
                hint: `Required (5 to ${FIELD_LIMITS.REASON_MAX} characters)`,
                required: true,
              })}
              <div class="modal__actions">
                <button type="button" class="btn btn--ghost" data-rep-close ${busy ? 'disabled' : ''}>Cancel</button>
                ${button({ label: submitLabel, type: 'submit', variant: 'danger', busy, attrs: 'data-rep-submit' })}
              </div>
            </form>
          </div>
        </div>
      `,
    );

    modalRoot.querySelectorAll('[data-rep-close]').forEach((el) => el.addEventListener('click', () => !busy && close()));
    modalRoot.querySelector('[data-rep-backdrop]')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget && !busy) close();
    });

    const form = /** @type {HTMLFormElement | null} */ (modalRoot.querySelector('[data-rep-form]'));
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      reason = String(new FormData(form).get('reason') || '').trim();
      const valid = validateModerationText(reason, 5);
      if (!valid.ok) {
        error = valid.reason || 'Reason required.';
        return paint();
      }
      busy = true;
      error = '';
      paint();
      try {
        await onSubmit(valid.text);
        close();
      } catch (err) {
        error = err.message || 'Submission failed.';
        busy = false;
        paint();
      }
    });
  }

  paint();
}
