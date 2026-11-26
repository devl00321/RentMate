/**
 * Toast notification helper rendered into the #toast-root live region.
 */
import { html, renderHtml } from './dom.js';

/**
 * Show a temporary toast notification.
 * @param {string} message
 * @param {{ variant?: 'info' | 'success' | 'error', durationMs?: number }} [opts]
 */
export function showToast(message, opts = {}) {
  const stack = document.getElementById('toast-root');
  if (!stack) return;

  const { variant = 'info', durationMs = 4000 } = opts;
  const mod = variant === 'info' ? '' : ` toast--${variant}`;

  const el = document.createElement('div');
  el.className = `toast${mod}`;
  el.setAttribute('role', variant === 'error' ? 'alert' : 'status');
  renderHtml(
    el,
    html`<span>${message}</span><button type="button" class="btn btn--ghost toast__dismiss" aria-label="Dismiss notification">Dismiss</button>`,
  );

  const dismiss = () => {
    if (el.parentNode) el.parentNode.removeChild(el);
  };

  el.querySelector('button')?.addEventListener('click', dismiss);
  stack.appendChild(el);

  if (durationMs > 0) {
    window.setTimeout(dismiss, durationMs);
  }
}
