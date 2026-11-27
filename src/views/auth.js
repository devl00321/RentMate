/**
 * Authentication view: email sign-in/sign-up/reset plus Phone OTP flow.
 */
import { html, renderHtml } from '../components/dom.js';
import { button, field } from '../components/ui.js';
import { showToast } from '../components/toast.js';
import { validateAuthInput } from '../domain/validators.js';
import {
  getCurrentUser,
  resetPassword,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
} from '../services/auth.js';
import { mountPhoneAuth } from './authPhone.js';

/**
 * Render authentication view.
 * @param {Element} outlet
 * @param {{ navigate: (path: string) => void }} ctx
 * @returns {Promise<() => void>}
 */
export async function render(outlet, ctx) {
  let mode = /** @type {'signin' | 'signup' | 'phone' | 'reset'} */ ('signin');
  let errors = /** @type {Record<string, string>} */ ({});
  let formError = '';
  let values = { email: '', password: '', name: '', city: '' };
  let phoneCleanup = null;

  let currentUser = null;
  try {
    currentUser = await getCurrentUser();
  } catch (err) {
    formError = err.message || 'Auth is not configured.';
  }

  function cleanupPhone() {
    if (phoneCleanup) {
      phoneCleanup();
      phoneCleanup = null;
    }
  }

  function paint() {
    cleanupPhone();
    if (currentUser) {
      renderHtml(
        outlet,
        html`
          <section class="card panel" style="max-width:520px;margin:var(--s6) auto">
            <h1>Signed in</h1>
            <p class="muted">Account: ${currentUser.name || currentUser.email || currentUser.uid}</p>
            <div style="display:flex;gap:var(--s3);flex-wrap:wrap">
              <a class="btn" href="#/profile/${currentUser.uid}">Your profile</a>
              ${button({ label: 'Sign out', variant: 'ghost', attrs: 'data-signout' })}
            </div>
          </section>
        `,
      );
      outlet.querySelector('[data-signout]')?.addEventListener('click', async (e) => {
        const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
        btn.disabled = true;
        try {
          await signOutUser();
          showToast('Signed out', { variant: 'success' });
          currentUser = null;
          paint();
        } catch (err) {
          showToast(err.message, { variant: 'error' });
          btn.disabled = false;
        }
      });
      return;
    }

    const titleMap = {
      signin: 'Sign in to RentMate',
      signup: 'Create your RentMate account',
      phone: 'Sign in with phone OTP',
      reset: 'Reset password',
    };

    renderHtml(
      outlet,
      html`
        <section class="card panel" style="max-width:520px;margin:var(--s6) auto">
          <h1>${titleMap[mode]}</h1>
          <p class="muted">Use one account to rent items and lend your own.</p>
          <div style="display:flex;gap:var(--s2);flex-wrap:wrap" role="tablist" aria-label="Authentication mode">
            <button type="button" class="btn ${mode === 'signin' ? '' : 'btn--ghost'}" data-mode="signin">Email sign in</button>
            <button type="button" class="btn ${mode === 'signup' ? '' : 'btn--ghost'}" data-mode="signup">Create account</button>
            <button type="button" class="btn ${mode === 'phone' ? '' : 'btn--ghost'}" data-mode="phone">Phone OTP</button>
            <button type="button" class="btn ${mode === 'reset' ? '' : 'btn--ghost'}" data-mode="reset">Reset</button>
          </div>
          <div data-auth-panel></div>
        </section>
      `,
    );

    outlet.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        mode = /** @type {any} */ (btn.getAttribute('data-mode'));
        errors = {};
        formError = '';
        paint();
      });
    });

    const panel = outlet.querySelector('[data-auth-panel]');
    if (!panel) return;
    if (mode === 'phone') {
      phoneCleanup = mountPhoneAuth(panel, { onSuccess: () => ctx.navigate('/') });
      return;
    }

    const submitLabel = mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in';
    renderHtml(
      panel,
      html`
        <form style="display:grid;gap:var(--s4)" novalidate data-auth-form>
          ${formError ? html`<div class="chip chip--danger" role="alert">${formError}</div>` : ''}
          ${mode === 'signup' ? field({ id: 'auth-name', name: 'name', label: 'Full name', value: values.name, error: errors.name, required: true }) : ''}
          ${mode === 'signup' ? field({ id: 'auth-city', name: 'city', label: 'City', value: values.city, error: errors.city, hint: 'Shown on your listings and profile', required: true }) : ''}
          ${field({ id: 'auth-email', name: 'email', type: 'email', label: 'Email address', value: values.email, error: errors.email, required: true })}
          ${mode !== 'reset' ? field({ id: 'auth-password', name: 'password', type: 'password', label: 'Password', value: values.password, error: errors.password, hint: mode === 'signup' ? 'At least 6 characters' : '', required: true }) : ''}
          ${button({ label: submitLabel, type: 'submit', attrs: 'data-submit-auth' })}
        </form>
      `,
    );

    const form = /** @type {HTMLFormElement | null} */ (panel.querySelector('[data-auth-form]'));
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      values = {
        email: String(fd.get('email') || '').trim(),
        password: String(fd.get('password') || ''),
        name: String(fd.get('name') || '').trim(),
        city: String(fd.get('city') || '').trim(),
      };
      errors = validateAuthInput(mode, values);
      formError = '';
      if (Object.keys(errors).length > 0) return paint();

      const btn = /** @type {HTMLButtonElement | null} */ (panel.querySelector('[data-submit-auth]'));
      if (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
      }
      try {
        if (mode === 'signup') {
          await signUpWithEmail(values);
          showToast('Account created', { variant: 'success' });
          ctx.navigate('/');
        } else if (mode === 'signin') {
          await signInWithEmail(values);
          showToast('Signed in', { variant: 'success' });
          ctx.navigate('/');
        } else {
          await resetPassword(values.email);
          showToast('Reset email sent if account exists', { variant: 'success' });
          mode = 'signin';
          paint();
        }
      } catch (err) {
        formError = err.message || 'Authentication failed.';
        paint();
      }
    });
  }

  paint();
  return cleanupPhone;
}
