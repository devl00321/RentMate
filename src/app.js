/**
 * RentMate application entry point.
 */
import { html, renderHtml } from './components/dom.js';
import { createRouter } from './router.js';

const ROUTES = [
  { path: '/', title: 'Home', load: () => import('./views/home.js') },
  { path: '/search', title: 'Browse', load: () => import('./views/search.js') },
  { path: '/demo', title: 'Components', load: () => import('./views/demo.js') },
];

/**
 * Boot the application router inside #app.
 */
function boot() {
  const root = document.getElementById('app');
  if (!root) return;
  renderHtml(root, html`<div class="wrap"><main id="main-content" tabindex="-1"></main></div>`);

  const router = createRouter({
    routes: ROUTES,
    getOutlet: () => document.getElementById('main-content'),
  });
  router.start();
}

boot();
