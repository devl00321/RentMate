/**
 * Empty state and error banner components (rules/06 s7).
 */
import { html } from './dom.js';

/**
 * Render an empty state card with plain action guidance.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.actionLabel]
 * @param {string} [opts.actionHref]
 * @returns {ReturnType<typeof html>}
 */
export function emptyState({ title, message, actionLabel = '', actionHref = '' }) {
  return html`
    <section class="card empty-state">
      <h2>${title}</h2>
      <p class="muted">${message}</p>
      ${actionLabel && actionHref ? html`<a class="btn" href="${actionHref}">${actionLabel}</a>` : ''}
    </section>
  `;
}

/**
 * Render a retryable error state card.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.retryAttr]
 * @returns {ReturnType<typeof html>}
 */
export function errorState({ title, message }) {
  return html`
    <section class="card empty-state" role="alert">
      <h2>${title}</h2>
      <p class="muted">${message}</p>
      <button type="button" class="btn" data-retry>Retry</button>
    </section>
  `;
}
