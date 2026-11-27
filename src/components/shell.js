/**
 * Application shell: skip link, header, navigation, theme toggle, outlet, and footer.
 */
import { html, renderHtml } from './dom.js';

const THEME_KEY = 'rentmate-theme';

/**
 * Determine effective current theme ('light' or 'dark').
 * @returns {'light' | 'dark'}
 */
export function getActiveTheme() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply theme to document root and update toggle button state.
 * @param {'light' | 'dark'} theme
 * @param {HTMLButtonElement | null} [btn]
 */
export function applyTheme(theme, btn = null) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  if (btn) {
    const isDark = theme === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    btn.textContent = isDark ? 'Light theme' : 'Dark theme';
  }
}

/**
 * Initialize saved theme before render.
 */
export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved);
  }
}

/**
 * Render the outer app shell into #app.
 * @param {Element} root
 * @param {{ user?: { name?: string, uid?: string } | null }} [state]
 */
export function renderShell(root, state = {}) {
  const user = state.user || null;
  const initial = user?.name ? user.name.trim().charAt(0).toUpperCase() : '';
  const isDark = getActiveTheme() === 'dark';

  renderHtml(
    root,
    html`
      <a class="skip-link" href="#main-content" data-skip-main>Skip to main content</a>
      <div class="wrap">
        <header class="top">
          <a class="brand" href="#/">
            <span class="price-tag" aria-hidden="true">rent</span>RentMate
          </a>
          <nav class="nav" aria-label="Main">
            <a href="#/search" data-nav="/search">Browse</a>
            <a href="#/list" data-nav="/list">List an item</a>
            <a href="#/dashboard" data-nav="/dashboard">Dashboard</a>
            <button
              type="button"
              class="btn btn--ghost theme-btn"
              data-theme-toggle
              aria-pressed="${String(isDark)}"
            >${isDark ? 'Light theme' : 'Dark theme'}</button>
            <span data-auth-slot>
              ${user
                ? html`<a class="keep" href="#/profile/${user.uid}" data-nav="/profile" aria-label="Your profile">
                    <span class="avatar">${initial || 'U'}</span>
                  </a>`
                : html`<a class="keep btn btn--ghost" href="#/auth" data-nav="/auth">Sign in</a>`}
            </span>
          </nav>
        </header>

        <main id="main-content" tabindex="-1"></main>

        <footer class="app-footer muted">
          <span>RentMate — Peer-to-peer rental marketplace</span>
          <span>Test mode: no real money moves · <a href="#/demo">UI preview</a></span>
        </footer>
      </div>
      <div id="toast-root" class="toast-stack" aria-live="polite" aria-atomic="true"></div>
      <div id="modal-root"></div>
    `,
  );

  const skipLink = root.querySelector('[data-skip-main]');
  skipLink?.addEventListener('click', (event) => {
    event.preventDefault();
    const main = document.getElementById('main-content');
    main?.focus();
  });

  const themeBtn = /** @type {HTMLButtonElement | null} */ (root.querySelector('[data-theme-toggle]'));
  themeBtn?.addEventListener('click', () => {
    const next = getActiveTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next, themeBtn);
  });
}

/**
 * Update only the account slot in the header without re-mounting #main-content.
 * @param {{ uid: string, name?: string | null } | null} user
 */
export function updateShellUser(user) {
  const slot = document.querySelector('[data-auth-slot]');
  if (!slot) return;
  const initial = user?.name ? user.name.trim().charAt(0).toUpperCase() : '';
  renderHtml(
    slot,
    user
      ? html`<a class="keep" href="#/profile/${user.uid}" data-nav="/profile" aria-label="Your profile">
          <span class="avatar">${initial || 'U'}</span>
        </a>`
      : html`<a class="keep btn btn--ghost" href="#/auth" data-nav="/auth">Sign in</a>`,
  );
}

/**
 * Update aria-current="page" on matching nav links.
 * @param {string} currentPath
 */
export function updateNavActive(currentPath) {
  const links = document.querySelectorAll('header .nav a[data-nav]');
  links.forEach((link) => {
    const target = link.getAttribute('data-nav') || '';
    const isMatch =
      currentPath === target || (target !== '/' && currentPath.startsWith(`${target}/`));
    if (isMatch) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}
