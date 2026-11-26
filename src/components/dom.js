/**
 * Safe DOM & HTML helpers. All interpolated values in `html` are escaped by default.
 */

const ESCAPE_MAP = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
});

const inrFormat = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
});

/**
 * Wrapper marking an already-safe HTML fragment.
 */
class SafeHtml {
  /** @param {string} value */
  constructor(value) {
    this.__html = value;
  }
  toString() {
    return this.__html;
  }
}

/**
 * Escape untrusted text for safe insertion into HTML.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined || value === false) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

/**
 * Mark a trusted static HTML string as safe (never pass user input).
 * @param {string} trusted
 * @returns {SafeHtml}
 */
export function raw(trusted) {
  return new SafeHtml(String(trusted));
}

/**
 * Serialize a single interpolated value inside `html` template.
 * @param {unknown} val
 * @returns {string}
 */
function serializeValue(val) {
  if (val instanceof SafeHtml) return val.__html;
  if (Array.isArray(val)) return val.map(serializeValue).join('');
  return escapeHtml(val);
}

/**
 * Tagged template literal that escapes all interpolated values by default.
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {SafeHtml}
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += serializeValue(values[i]) + strings[i + 1];
  }
  return new SafeHtml(out);
}

/**
 * Mount a SafeHtml fragment into an element. Rejects plain strings.
 * @param {Element} container
 * @param {SafeHtml} fragment
 */
export function renderHtml(container, fragment) {
  if (!(fragment instanceof SafeHtml)) {
    throw new TypeError('renderHtml requires a SafeHtml fragment from html`...`');
  }
  container.innerHTML = fragment.__html;
}

/**
 * Format integer paise as Indian Rupee string (e.g. ₹1,200).
 * @param {number} paise
 * @returns {string}
 */
export function formatPaise(paise) {
  const rupees = (Number(paise) || 0) / 100;
  return `₹${inrFormat.format(rupees)}`;
}
