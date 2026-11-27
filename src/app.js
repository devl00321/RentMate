/**
 * RentMate application entry point.
 */
import { initTheme, renderShell, updateNavActive, updateShellUser } from './components/shell.js';
import { requireAdmin, requireAuth } from './domain/guards.js';
import { createRouter } from './router.js';
import { waitForAuthReady, watchAuthState } from './services/auth.js';
import { getUserProfile } from './services/users.js';

const ROUTES = [
  { path: '/', title: 'Home', load: () => import('./views/home.js') },
  { path: '/search', title: 'Browse', load: () => import('./views/search.js') },
  { path: '/listing/:id', title: 'Item details', load: () => import('./views/listingDetail.js') },
  { path: '/demo', title: 'Components', load: () => import('./views/demo.js') },
  { path: '/auth', title: 'Sign in', load: () => import('./views/auth.js') },
  { path: '/list', title: 'List an item', guard: requireAuth, load: () => import('./views/listingForm.js') },
  { path: '/list/:id', title: 'Edit listing', guard: requireAuth, load: () => import('./views/listingForm.js') },
  { path: '/booking/:id', title: 'Booking', guard: requireAuth, load: () => import('./views/booking.js') },
  { path: '/dashboard', title: 'Dashboard', guard: requireAuth, load: () => import('./views/dashboard.js') },
  { path: '/profile', title: 'Your profile', guard: requireAuth, load: () => import('./views/profile.js') },
  { path: '/profile/:id', title: 'Profile', load: () => import('./views/profile.js') },
  { path: '/admin', title: 'Admin', guard: requireAdmin, load: () => import('./views/admin.js') },
];

/**
 * Boot the application shell, auth observer, and router inside #app.
 */
function boot() {
  const root = document.getElementById('app');
  if (!root) return;

  let currentUser = null;
  let currentProfile = null;
  let profileUid = '';

  async function resolveProfile(user) {
    if (!user?.uid) {
      currentProfile = null;
      profileUid = '';
      return null;
    }
    if (profileUid === user.uid && currentProfile) return currentProfile;
    try {
      currentProfile = await getUserProfile(user.uid);
      profileUid = user.uid;
    } catch {
      currentProfile = null;
    }
    return currentProfile;
  }

  initTheme();
  renderShell(root, { user: null, profile: null });

  const router = createRouter({
    routes: ROUTES,
    getOutlet: () => document.getElementById('main-content'),
    getAuthContext: async () => {
      if (!currentUser) currentUser = await waitForAuthReady();
      const profile = await resolveProfile(currentUser);
      return { user: currentUser, profile };
    },
    onRouteChange: (path) => updateNavActive(path),
  });
  router.start();

  watchAuthState(async (user) => {
    const prevUid = currentUser?.uid || null;
    const nextUid = user?.uid || null;
    currentUser = user;
    const profile = await resolveProfile(user);
    updateShellUser(user, profile);
    if (prevUid !== nextUid) {
      router.resolve();
    }
  }).catch((err) => {
    console.warn('Auth observer inactive:', err.message);
  });
}

boot();
