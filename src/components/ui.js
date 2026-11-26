/**
 * Basic UI primitives: buttons, form fields, chips, and loading skeletons.
 */
import { html, raw } from './dom.js';

/**
 * Render a button element HTML fragment.
 * @param {object} opts
 * @param {string} opts.label
 * @param {'primary' | 'ghost' | 'danger'} [opts.variant]
 * @param {'button' | 'submit'} [opts.type]
 * @param {boolean} [opts.disabled]
 * @param {boolean} [opts.busy]
 * @param {string} [opts.attrs] - Trusted static attributes like `data-action="save"`
 * @returns {ReturnType<typeof html>}
 */
export function button({
  label,
  variant = 'primary',
  type = 'button',
  disabled = false,
  busy = false,
  attrs = '',
}) {
  const variantClass = variant === 'primary' ? '' : ` btn--${variant}`;
  const busyAttr = busy ? raw(' aria-busy="true"') : '';
  const disabledAttr = disabled || busy ? raw(' disabled') : '';
  const extra = attrs ? raw(` ${attrs}`) : '';
  return html`<button class="btn${variantClass}" type="${type}"${busyAttr}${disabledAttr}${extra}>${label}</button>`;
}

/**
 * Render an accessible form field with label, optional hint, and error message.
 * @param {object} opts
 * @param {string} opts.id
 * @param {string} opts.label
 * @param {string} [opts.name]
 * @param {string} [opts.type]
 * @param {string} [opts.value]
 * @param {string} [opts.placeholder]
 * @param {string} [opts.hint]
 * @param {string} [opts.error]
 * @param {boolean} [opts.required]
 * @param {Array<{ value: string, label: string }>} [opts.options] - For select fields
 * @param {number} [opts.rows] - For textarea fields
 * @returns {ReturnType<typeof html>}
 */
export function field({
  id,
  label,
  name = id,
  type = 'text',
  value = '',
  placeholder = '',
  hint = '',
  error = '',
  required = false,
  options = [],
  rows = 3,
}) {
  const hintId = hint ? `${id}-hint` : '';
  const errorId = error ? `${id}-error` : '';
  const describedBy = [hintId, errorId].filter(Boolean).join(' ');
  const ariaDescribed = describedBy ? raw(` aria-describedby="${describedBy}"`) : '';
  const ariaInvalid = error ? raw(' aria-invalid="true"') : '';
  const reqAttr = required ? raw(' required') : '';

  let control;
  if (type === 'select') {
    control = html`
      <select id="${id}" name="${name}"${ariaDescribed}${ariaInvalid}${reqAttr}>
        ${options.map((opt) => {
          const sel = String(opt.value) === String(value) ? raw(' selected') : '';
          return html`<option value="${opt.value}"${sel}>${opt.label}</option>`;
        })}
      </select>
    `;
  } else if (type === 'textarea') {
    control = html`<textarea id="${id}" name="${name}" rows="${rows}" placeholder="${placeholder}"${ariaDescribed}${ariaInvalid}${reqAttr}>${value}</textarea>`;
  } else {
    control = html`<input id="${id}" name="${name}" type="${type}" value="${value}" placeholder="${placeholder}"${ariaDescribed}${ariaInvalid}${reqAttr}>`;
  }

  return html`
    <div class="field${error ? ' field--error' : ''}">
      <label for="${id}">${label}</label>
      ${control}
      ${hint ? html`<span id="${hintId}" class="field__hint">${hint}</span>` : ''}
      ${error ? html`<span id="${errorId}" class="field__error" role="alert">${error}</span>` : ''}
    </div>
  `;
}

/**
 * Render a status/tag chip.
 * @param {string} text
 * @param {'default' | 'held' | 'danger'} [tone]
 * @returns {ReturnType<typeof html>}
 */
export function chip(text, tone = 'default') {
  const mod = tone === 'default' ? '' : ` chip--${tone}`;
  return html`<span class="chip${mod}">${text}</span>`;
}

/**
 * Render a listing-shaped loading skeleton grid.
 * @param {number} [count]
 * @returns {ReturnType<typeof html>}
 */
export function skeletonCards(count = 3) {
  const items = Array.from({ length: count }, (_, i) => i);
  return html`
    <div class="grid" aria-busy="true" aria-label="Loading items">
      ${items.map(
        () => html`
          <div class="card">
            <div class="skeleton" style="aspect-ratio:4/3"></div>
            <div class="listing__body">
              <div class="skeleton" style="height:20px;width:75%"></div>
              <div class="skeleton" style="height:28px;width:45%"></div>
              <div class="skeleton" style="height:16px;width:60%"></div>
            </div>
          </div>
        `,
      )}
    </div>
  `;
}
