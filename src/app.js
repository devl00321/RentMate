/**
 * RentMate application entry point.
 */
import { initTheme, renderShell, updateNavActive } from './components/shell.js';
import { createRouter } from './router.js';

const ROUTES = [
  { path: '/', title: 'Home', load: () => import('./views/home.js') },
  { path: '/search', title: 'Browse', load: () => import('./views/search.js') },
  { path: '/demo', title: 'Components', load: () => import('./views/demo.js') },
];

/**
 * Boot the application shell and router inside #app.
 */
function boot() {
  const root = document.getElementById('app');
  if (!root) return;

  initTheme();
  renderShell(root, { user: null });

  const router = createRouter({
    routes: ROUTES,
    getOutlet: () => document.getElementById('main-content'),
    onRouteChange: (path) => updateNavActive(path),
  });
  router.start();
}

boot();
