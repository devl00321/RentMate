/**
 * Accessible modal dialog component with focus management and Escape handling.
 */
import { html, renderHtml } from './dom.js';

/**
 * Open a modal dialog inside #modal-root.
 * @param {object} opts
 * @param {string} opts.title
 * @param {ReturnType<typeof html> | string} opts.body
 * @param {string} [opts.confirmLabel]
 * @param {string} [opts.cancelLabel]
 * @param {boolean} [opts.danger]
 * @param {() => (void | Promise<void>)} [opts.onConfirm]
 * @returns {{ close: () => void }}
 */
export function openModal({
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
}) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return { close: () => {} };

  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const titleId = 'modal-dialog-title';
  const btnClass = danger ? 'btn btn--danger' : 'btn';

  renderHtml(
    modalRoot,
    html`
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="card modal" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
          <div class="modal__head">
            <h2 id="${titleId}">${title}</h2>
            <button type="button" class="btn btn--ghost" data-modal-close aria-label="Close dialog">Close</button>
          </div>
          <div class="modal__body">${body}</div>
          <div class="modal__actions">
            <button type="button" class="btn btn--ghost" data-modal-close>${cancelLabel}</button>
            ${onConfirm ? html`<button type="button" class="${btnClass}" data-modal-confirm>${confirmLabel}</button>` : ''}
          </div>
        </div>
      </div>
    `,
  );

  function close() {
    document.removeEventListener('keydown', onKeyDown);
    modalRoot.innerHTML = '';
    previousFocus?.focus();
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  document.addEventListener('keydown', onKeyDown);
  modalRoot.querySelector('[data-modal-backdrop]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) close();
  });
  modalRoot.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', close);
  });

  const confirmBtn = /** @type {HTMLButtonElement | null} */ (modalRoot.querySelector('[data-modal-confirm]'));
  confirmBtn?.addEventListener('click', async () => {
    if (!onConfirm) return close();
    confirmBtn.disabled = true;
    confirmBtn.setAttribute('aria-busy', 'true');
    try {
      await onConfirm();
      close();
    } finally {
      if (document.body.contains(confirmBtn)) {
        confirmBtn.disabled = false;
        confirmBtn.removeAttribute('aria-busy');
      }
    }
  });

  const firstButton = /** @type {HTMLElement | null} */ (modalRoot.querySelector('button, input, textarea, select'));
  firstButton?.focus();

  return { close };
}
