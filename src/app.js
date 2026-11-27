/**
 * RentMate application entry point.
 */
import { initTheme, renderShell, updateNavActive, updateShellUser } from './components/shell.js';
import { createRouter } from './router.js';
import { watchAuthState } from './services/auth.js';

const ROUTES = [
  { path: '/', title: 'Home', load: () => import('./views/home.js') },
  { path: '/search', title: 'Browse', load: () => import('./views/search.js') },
  { path: '/demo', title: 'Components', load: () => import('./views/demo.js') },
  { path: '/auth', title: 'Sign in', load: () => import('./views/auth.js') },
];

/**
 * Boot the application shell, auth observer, and router inside #app.
 */
function boot() {
  const root = document.getElementById('app');
  if (!root) return;

  let currentUser = null;
  initTheme();
  renderShell(root, { user: null });

  const router = createRouter({
    routes: ROUTES,
    getOutlet: () => document.getElementById('main-content'),
    onRouteChange: (path) => updateNavActive(path),
  });
  router.start();

  watchAuthState((user) => {
    const prevUid = currentUser?.uid || null;
    const nextUid = user?.uid || null;
    currentUser = user;
    updateShellUser(user);
    if (prevUid !== nextUid) {
      updateNavActive(window.location.hash.replace(/^#/, '') || '/');
    }
  }).catch((err) => {
    console.warn('Auth observer inactive:', err.message);
  });
}

boot();
