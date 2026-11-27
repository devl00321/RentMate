/**
 * Verified badge component (M2.5). `verified` can only be set by admin/console (OQ-005).
 */
import { html } from './dom.js';

/**
 * Render the teal Verified chip when `isVerified` is true.
 * @param {boolean} isVerified
 * @param {boolean} [showUnverified]
 * @returns {ReturnType<typeof html> | string}
 */
export function verifiedBadge(isVerified, showUnverified = false) {
  if (isVerified) {
    return html`<span class="chip chip--held" aria-label="Verified member">✓ Verified</span>`;
  }
  return showUnverified ? html`<span class="chip">Unverified</span>` : '';
}
