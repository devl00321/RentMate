/**
 * Hash-based SPA router with lazy module loading, view cleanup, and 404 handling.
 */
import { html, renderHtml } from './components/dom.js';

/**
 * Parse a location hash into normalized path and query object.
 * @param {string} hash
 * @returns {{ path: string, query: Record<string, string> }}
 */
export function parseHash(hash) {
  const rawHash = (hash || '').replace(/^#/, '');
  const [rawPath, rawQuery = ''] = rawHash.split('?');
  const path = rawPath && rawPath.startsWith('/') ? rawPath : `/${rawPath || ''}`;
  const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path;
  /** @type {Record<string, string>} */
  const query = {};
  if (rawQuery) {
    const sp = new URLSearchParams(rawQuery);
    for (const [k, v] of sp.entries()) query[k] = v;
  }
  return { path: normalized || '/', query };
}

/**
 * Match a normalized path against route definitions (`:param` supported).
 * @param {string} hash
 * @param {Array<{ path: string, [key: string]: unknown }>} routes
 * @returns {{ route: object, path: string, params: Record<string, string>, query: Record<string, string> } | null}
 */
export function matchRoute(hash, routes) {
  const { path, query } = parseHash(hash);
  const segs = path.split('/').filter(Boolean);
  for (const route of routes) {
    const patternSegs = route.path.split('/').filter(Boolean);
    if (segs.length !== patternSegs.length) continue;
    /** @type {Record<string, string>} */
    const params = {};
    let matched = true;
    for (let i = 0; i < patternSegs.length; i += 1) {
      if (patternSegs[i].startsWith(':')) {
        params[patternSegs[i].slice(1)] = decodeURIComponent(segs[i]);
      } else if (patternSegs[i] !== segs[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, path, params, query };
  }
  return null;
}

/**
 * Default 404 view renderer.
 * @param {Element} outlet
 * @param {{ path: string }} ctx
 */
function renderNotFound(outlet, ctx) {
  renderHtml(
    outlet,
    html`
      <section class="card empty-state" aria-labelledby="not-found-title">
        <h1 id="not-found-title">Page not found</h1>
        <p class="muted">We could not find <code>${ctx.path}</code>.</p>
        <a class="btn" href="#/">Back to home</a>
      </section>
    `,
  );
}

/**
 * Create and start a hash router.
 * @param {object} opts
 * @param {Array<{ path: string, title?: string, load: () => Promise<any>, guard?: (ctx: any) => string | null }>} opts.routes
 * @param {() => Element | null} opts.getOutlet
 * @param {(path: string) => void} [opts.onRouteChange]
 */
export function createRouter({ routes, getOutlet, getAuthContext, onRouteChange }) {
  let activeCleanup = null;
  let navId = 0;

  async function resolve() {
    const currentNav = ++navId;
    const outlet = getOutlet();
    if (!outlet) return;

    if (typeof activeCleanup === 'function') {
      try {
        activeCleanup();
      } catch (err) {
        console.error('View cleanup failed:', err);
      }
      activeCleanup = null;
    }

    const { path, query } = parseHash(window.location.hash);
    const match = matchRoute(window.location.hash, routes);
    onRouteChange?.(path);

    if (!match) {
      document.title = 'Not found — RentMate';
      renderNotFound(outlet, { path, query });
      return;
    }

    const authCtx = typeof getAuthContext === 'function' ? await getAuthContext() : {};
    if (currentNav !== navId) return;

    const ctx = { path, params: match.params, query, navigate, ...authCtx };
    if (typeof match.route.guard === 'function') {
      const redirect = match.route.guard(ctx);
      if (redirect) {
        navigate(redirect);
        return;
      }
    }

    try {
      const mod = await match.route.load();
      if (currentNav !== navId) return;
      document.title = match.route.title ? `${match.route.title} — RentMate` : 'RentMate';
      const maybeCleanup = await mod.render(outlet, ctx);
      if (currentNav === navId && typeof maybeCleanup === 'function') {
        activeCleanup = maybeCleanup;
      }
      if (outlet instanceof HTMLElement) {
        outlet.focus({ preventScroll: true });
      }
    } catch (err) {
      if (currentNav !== navId) return;
      console.error('Route load failed:', err);
      renderHtml(
        outlet,
        html`
          <section class="card empty-state">
            <h2>Could not load this view</h2>
            <p class="muted">Check your connection and try again.</p>
            <button class="btn" type="button" data-retry>Retry</button>
          </section>
        `,
      );
      outlet.querySelector('[data-retry]')?.addEventListener('click', resolve);
    }
  }

  /**
   * Programmatically navigate to a hash path.
   * @param {string} hashPath
   */
  function navigate(hashPath) {
    const target = hashPath.startsWith('#') ? hashPath : `#${hashPath}`;
    if (window.location.hash === target) {
      resolve();
    } else {
      window.location.hash = target;
    }
  }

  function start() {
    window.addEventListener('hashchange', resolve);
    resolve();
  }

  function stop() {
    window.removeEventListener('hashchange', resolve);
    if (typeof activeCleanup === 'function') activeCleanup();
    activeCleanup = null;
  }

  return { start, stop, navigate, resolve };
}
