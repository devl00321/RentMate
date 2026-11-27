/**
 * Accessible 6-cell OTP input component (rules/06 s5).
 */
import { html, raw } from './dom.js';

/**
 * Extract up to 6 numeric digits from pasted/entered text.
 * @param {string} raw
 * @returns {string[]}
 */
export function parseOtpDigits(raw) {
  return String(raw || '').replace(/\D/g, '').slice(0, 6).split('');
}

/**
 * Render 6 individual numeric OTP input cells.
 * @param {{ idPrefix?: string, error?: string }} [opts]
 * @returns {ReturnType<typeof html>}
 */
export function renderOtpCells({ idPrefix = 'otp', error = '' } = {}) {
  const cells = [0, 1, 2, 3, 4, 5];
  const errorId = error ? `${idPrefix}-error` : '';
  return html`
    <div class="field${error ? ' field--error' : ''}">
      <span id="${idPrefix}-label" style="font-size:var(--fs-m);font-weight:600">6-digit verification code</span>
      <div class="otp-cells" role="group" aria-labelledby="${idPrefix}-label" data-otp-group>
        ${cells.map(
          (i) => html`
            <input
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="1"
              class="otp-cell"
              data-otp-index="${i}"
              aria-label="Digit ${i + 1} of 6"
              autocomplete="${i === 0 ? 'one-time-code' : 'off'}"${errorId ? raw(` aria-describedby="${errorId}"`) : ''}
            >
          `,
        )}
      </div>
      ${error ? html`<span id="${errorId}" class="field__error" role="alert">${error}</span>` : ''}
    </div>
  `;
}

/**
 * Attach keyboard, paste, and auto-advance handlers to rendered OTP cells.
 * @param {Element} root
 * @param {(code: string) => void} [onChange]
 * @returns {{ getCode: () => string, focusFirst: () => void, destroy: () => void }}
 */
export function bindOtpCells(root, onChange) {
  const inputs = Array.from(root.querySelectorAll('.otp-cell'));
  const getCode = () => inputs.map((el) => /** @type {HTMLInputElement} */ (el).value).join('');

  function onInput(e) {
    const target = /** @type {HTMLInputElement} */ (e.target);
    const idx = Number(target.dataset.otpIndex);
    const digits = parseOtpDigits(target.value);
    if (digits.length > 1) {
      digits.forEach((d, offset) => {
        const cell = /** @type {HTMLInputElement | undefined} */ (inputs[idx + offset]);
        if (cell) cell.value = d;
      });
      const next = /** @type {HTMLInputElement | undefined} */ (inputs[Math.min(5, idx + digits.length)]);
      next?.focus();
    } else {
      target.value = digits[0] || '';
      if (target.value && idx < 5) {
        /** @type {HTMLInputElement} */ (inputs[idx + 1]).focus();
      }
    }
    onChange?.(getCode());
  }

  function onKeyDown(e) {
    const target = /** @type {HTMLInputElement} */ (e.target);
    const idx = Number(target.dataset.otpIndex);
    if (e.key === 'Backspace' && !target.value && idx > 0) {
      const prev = /** @type {HTMLInputElement} */ (inputs[idx - 1]);
      prev.value = '';
      prev.focus();
      onChange?.(getCode());
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      /** @type {HTMLInputElement} */ (inputs[idx - 1]).focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      /** @type {HTMLInputElement} */ (inputs[idx + 1]).focus();
    }
  }

  function onPaste(e) {
    const text = e.clipboardData?.getData('text') || '';
    const digits = parseOtpDigits(text);
    if (!digits.length) return;
    e.preventDefault();
    inputs.forEach((el, i) => {
      /** @type {HTMLInputElement} */ (el).value = digits[i] || '';
    });
    const focusIdx = Math.min(5, digits.length);
    /** @type {HTMLInputElement | undefined} */ (inputs[focusIdx])?.focus();
    onChange?.(getCode());
  }

  inputs.forEach((el) => {
    el.addEventListener('input', onInput);
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('paste', onPaste);
  });

  return {
    getCode,
    focusFirst: () => /** @type {HTMLInputElement | undefined} */ (inputs[0])?.focus(),
    destroy: () => {
      inputs.forEach((el) => {
        el.removeEventListener('input', onInput);
        el.removeEventListener('keydown', onKeyDown);
        el.removeEventListener('paste', onPaste);
      });
    },
  };
}
