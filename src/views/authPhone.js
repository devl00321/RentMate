/**
 * Phone OTP authentication sub-panel (M2.3) with 6-cell input and resend timer.
 */
import { html, renderHtml } from '../components/dom.js';
import { button, field } from '../components/ui.js';
import { bindOtpCells, renderOtpCells } from '../components/otpInput.js';
import { showToast } from '../components/toast.js';
import { validatePhoneInput } from '../domain/validators.js';
import { confirmPhoneOtp, sendPhoneOtp } from '../services/phoneAuth.js';

/**
 * Mount the Phone OTP flow inside a container element.
 * @param {Element} container
 * @param {{ onSuccess: () => void }} opts
 * @returns {() => void} cleanup function
 */
export function mountPhoneAuth(container, { onSuccess }) {
  let phone = '';
  let confirmation = null;
  let errors = /** @type {Record<string, string>} */ ({});
  let formError = '';
  let cooldown = 0;
  let timerId = 0;
  let otpBinding = null;

  function stopTimer() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = 0;
    }
  }

  function startCooldown() {
    stopTimer();
    cooldown = 60;
    timerId = window.setInterval(() => {
      cooldown -= 1;
      const btn = container.querySelector('[data-resend-otp]');
      if (!btn) return stopTimer();
      if (cooldown <= 0) {
        stopTimer();
        btn.removeAttribute('disabled');
        btn.textContent = 'Resend code';
      } else {
        btn.setAttribute('disabled', 'true');
        btn.textContent = `Resend in ${cooldown}s`;
      }
    }, 1000);
  }

  function paint() {
    otpBinding?.destroy();
    otpBinding = null;

    if (!confirmation) {
      renderHtml(
        container,
        html`
          <form style="display:grid;gap:var(--s4)" novalidate data-phone-form>
            ${formError ? html`<div class="chip chip--danger" role="alert">${formError}</div>` : ''}
            ${field({
              id: 'auth-phone',
              name: 'phone',
              type: 'tel',
              label: 'Phone number',
              value: phone,
              placeholder: '+919876543210',
              hint: 'Include country code. Test numbers configured in Firebase Console work without SMS.',
              error: errors.phone,
              required: true,
            })}
            <div id="recaptcha-container"></div>
            ${button({ label: 'Send code', type: 'submit', attrs: 'data-send-otp' })}
          </form>
        `,
      );

      container.querySelector('[data-phone-form]')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = /** @type {HTMLInputElement} */ (container.querySelector('#auth-phone'));
        phone = input.value.trim();
        errors = validatePhoneInput(phone);
        formError = '';
        if (errors.phone) return paint();

        const btn = /** @type {HTMLButtonElement} */ (container.querySelector('[data-send-otp]'));
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        try {
          confirmation = await sendPhoneOtp(phone, 'recaptcha-container');
          showToast('Verification code sent', { variant: 'success' });
          startCooldown();
          paint();
        } catch (err) {
          formError = err.message;
          paint();
        }
      });
      return;
    }

    renderHtml(
      container,
      html`
        <form style="display:grid;gap:var(--s4)" novalidate data-otp-form>
          <p class="muted">Code sent to <strong>${phone}</strong>.</p>
          ${formError ? html`<div class="chip chip--danger" role="alert">${formError}</div>` : ''}
          ${renderOtpCells({ idPrefix: 'auth-otp', error: errors.otp })}
          <div style="display:flex;gap:var(--s3);flex-wrap:wrap">
            ${button({ label: 'Verify code', type: 'submit', attrs: 'data-verify-otp' })}
            <button type="button" class="btn btn--ghost" data-resend-otp ${cooldown > 0 ? 'disabled' : ''}>
              ${cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
            <button type="button" class="btn btn--ghost" data-change-phone>Change number</button>
          </div>
          <div id="recaptcha-container"></div>
        </form>
      `,
    );

    otpBinding = bindOtpCells(container);
    otpBinding.focusFirst();

    container.querySelector('[data-change-phone]')?.addEventListener('click', () => {
      stopTimer();
      confirmation = null;
      errors = {};
      formError = '';
      paint();
    });

    container.querySelector('[data-resend-otp]')?.addEventListener('click', async () => {
      if (cooldown > 0) return;
      try {
        confirmation = await sendPhoneOtp(phone, 'recaptcha-container');
        showToast('New verification code sent', { variant: 'success' });
        startCooldown();
      } catch (err) {
        formError = err.message;
        paint();
      }
    });

    container.querySelector('[data-otp-form]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = otpBinding?.getCode() || '';
      errors = validatePhoneInput(phone, code, true);
      formError = '';
      if (errors.otp) return paint();

      const btn = /** @type {HTMLButtonElement} */ (container.querySelector('[data-verify-otp]'));
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      try {
        await confirmPhoneOtp(confirmation, code);
        stopTimer();
        showToast('Phone verified and signed in', { variant: 'success' });
        onSuccess();
      } catch (err) {
        formError = err.message;
        paint();
      }
    });
  }

  paint();

  return () => {
    stopTimer();
    otpBinding?.destroy();
  };
}
