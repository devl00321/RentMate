/**
 * Owner availability ranges editor component (M3.2 & M3.5).
 */
import { validateAvailabilityRanges } from '../domain/listing.js';
import { html, renderHtml } from './dom.js';
import { field } from './ui.js';

/**
 * Mount availability range picker into container.
 * @param {Element} container
 * @param {{ ranges: Array<{ start: string, end: string }>, error?: string, onChange: (ranges: Array<{ start: string, end: string }>) => void }} opts
 */
export function mountAvailabilityEditor(container, opts) {
  let ranges = [...(opts.ranges || [])];
  let localError = opts.error || '';

  function paint() {
    const today = new Date().toISOString().slice(0, 10);
    renderHtml(
      container,
      html`
        <div style="display:grid;gap:var(--s4)">
          <div style="display:grid;gap:var(--s3);grid-template-columns:repeat(auto-fit,minmax(160px,1fr));align-items:end">
            ${field({ id: 'avail-start', name: 'start', type: 'date', label: 'Available from', value: today })}
            ${field({ id: 'avail-end', name: 'end', type: 'date', label: 'Available until', value: '' })}
            <button type="button" class="btn btn--ghost" data-add-range>Add date range</button>
          </div>

          ${localError ? html`<span class="field__error" role="alert">${localError}</span>` : ''}

          ${ranges.length > 0
            ? html`
                <ul style="list-style:none;margin:0;padding:0;display:grid;gap:var(--s2)">
                  ${ranges.map(
                    (r, i) => html`
                      <li class="card" style="padding:var(--s2) var(--s3);display:flex;justify-content:space-between;align-items:center;gap:var(--s3)">
                        <span><strong>${r.start}</strong> to <strong>${r.end}</strong></span>
                        <button type="button" class="btn btn--ghost" style="min-height:36px;padding:0 var(--s3)" data-remove-range="${i}" aria-label="Remove range ${r.start} to ${r.end}">Remove</button>
                      </li>
                    `,
                  )}
                </ul>
              `
            : html`<p class="muted">No date ranges added yet. Add at least one range renters can book.</p>`}
        </div>
      `,
    );

    container.querySelector('[data-add-range]')?.addEventListener('click', () => {
      const start = /** @type {HTMLInputElement} */ (container.querySelector('#avail-start')).value;
      const end = /** @type {HTMLInputElement} */ (container.querySelector('#avail-end')).value;
      const check = validateAvailabilityRanges([{ start, end }]);
      if (!check.ok) {
        localError = check.reason || 'Invalid date range.';
        paint();
        return;
      }
      localError = '';
      ranges = [...ranges, { start, end }];
      opts.onChange([...ranges]);
      paint();
    });

    container.querySelectorAll('[data-remove-range]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-remove-range'));
        ranges = ranges.filter((_, i) => i !== idx);
        opts.onChange([...ranges]);
        paint();
      });
    });
  }

  paint();
}
