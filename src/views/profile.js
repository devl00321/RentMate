/**
 * User profile view: public profile, verified badge, live reputation, recent reviews, self-edit (M2.4, M8.6).
 */
import { html, renderHtml } from '../components/dom.js';
import { button, field } from '../components/ui.js';
import { emptyState, errorState } from '../components/emptyState.js';
import { ratingStars } from '../components/ratingStars.js';
import { verifiedBadge } from '../components/verifiedBadge.js';
import { showToast } from '../components/toast.js';
import { validateProfileInput } from '../domain/validators.js';
import { getCurrentUser } from '../services/auth.js';
import { listUserReviews } from '../services/reviews.js';
import { ensureUserProfile, getUserProfile, updateUserProfile } from '../services/users.js';

/**
 * Render user profile screen (#/profile/:id or #/profile).
 * @param {Element} outlet
 * @param {{ params: { id?: string }, navigate: (path: string) => void }} ctx
 */
export async function render(outlet, ctx) {
  renderHtml(
    outlet,
    html`
      <section class="card panel" style="max-width:680px;margin:var(--s6) auto" aria-busy="true">
        <div class="skeleton" style="height:28px;width:45%"></div>
        <div class="skeleton" style="height:64px;width:100%"></div>
      </section>
    `,
  );

  let currentUser = null;
  try {
    currentUser = await getCurrentUser();
  } catch {
    currentUser = null;
  }

  const targetUid = ctx.params.id || currentUser?.uid || '';
  if (!targetUid) return ctx.navigate('/auth');

  const isOwn = Boolean(currentUser && currentUser.uid === targetUid);
  let profile = null;
  let reviewData = { reviews: /** @type {any[]} */ ([]), ratingAvg: 0, ratingCount: 0 };
  let loadError = '';

  async function loadProfile() {
    loadError = '';
    try {
      profile = isOwn
        ? await ensureUserProfile(targetUid, { name: currentUser?.name || 'RentMate Member', city: 'Not set' })
        : await getUserProfile(targetUid);
      if (profile) {
        try {
          reviewData = await listUserReviews(targetUid);
        } catch {
          reviewData = { reviews: [], ratingAvg: profile.ratingAvg || 0, ratingCount: profile.ratingCount || 0 };
        }
      }
    } catch (err) {
      loadError = err.message || 'Could not load profile.';
    }
  }

  await loadProfile();

  let editing = false;
  let errors = /** @type {Record<string, string>} */ ({});
  let draft = {
    name: profile?.name || '',
    city: profile?.city || '',
    photoUrl: profile?.photoUrl || '',
  };

  function paint() {
    if (loadError) {
      renderHtml(outlet, errorState({ title: 'Could not load profile', message: loadError }));
      outlet.querySelector('[data-retry]')?.addEventListener('click', async () => {
        await loadProfile();
        paint();
      });
      return;
    }

    if (!profile) {
      renderHtml(
        outlet,
        emptyState({
          title: 'Member not found',
          message: 'This profile does not exist or may have been removed.',
          actionLabel: 'Browse items',
          actionHref: '#/search',
        }),
      );
      return;
    }

    const avg = reviewData.ratingCount > 0 ? reviewData.ratingAvg : profile.ratingAvg;
    const count = reviewData.ratingCount > 0 ? reviewData.ratingCount : profile.ratingCount;
    const initial = (profile.name || 'U').trim().charAt(0).toUpperCase();

    renderHtml(
      outlet,
      html`
        <div style="max-width:680px;margin:var(--s6) auto;display:grid;gap:var(--s5)">
          <section class="card panel">
            <div style="display:flex;flex-wrap:wrap;gap:var(--s4);align-items:center;justify-content:space-between">
              <div style="display:flex;gap:var(--s4);align-items:center">
                ${profile.photoUrl
                  ? html`<img src="${profile.photoUrl}" alt="${profile.name} profile photo" width="64" height="64" style="border-radius:50%;object-fit:cover">`
                  : html`<span class="avatar" style="width:64px;height:64px;border-radius:50%;background:var(--cobalt-wash);color:var(--cobalt);display:grid;place-items:center;font-weight:700;font-size:var(--fs-xl)">${initial}</span>`}
                <div style="display:grid;gap:var(--s1)">
                  <h1>${profile.name}</h1>
                  <div style="display:flex;gap:var(--s2);flex-wrap:wrap;align-items:center">
                    <span class="muted">${profile.city || 'City not set'}</span>
                    ${verifiedBadge(profile.verified, true)}
                    ${ratingStars(avg, count)}
                  </div>
                </div>
              </div>
              ${isOwn && !editing ? button({ label: 'Edit profile', variant: 'ghost', attrs: 'data-edit-profile' }) : ''}
            </div>

            <p class="muted">One account works for renting and lending. Verification badges are granted by admins only.</p>

            ${editing
              ? html`
                  <form style="display:grid;gap:var(--s4);border-top:1px solid var(--mist);padding-top:var(--s4)" novalidate data-profile-form>
                    ${field({ id: 'prof-name', name: 'name', label: 'Full name', value: draft.name, error: errors.name, required: true })}
                    ${field({ id: 'prof-city', name: 'city', label: 'City', value: draft.city, error: errors.city, required: true })}
                    ${field({ id: 'prof-photo', name: 'photoUrl', type: 'url', label: 'Photo URL (https://)', value: draft.photoUrl, error: errors.photoUrl, hint: 'Optional profile picture URL' })}
                    <div style="display:flex;gap:var(--s3);flex-wrap:wrap">
                      ${button({ label: 'Save profile', type: 'submit', attrs: 'data-save-profile' })}
                      ${button({ label: 'Cancel', variant: 'ghost', attrs: 'data-cancel-edit' })}
                    </div>
                  </form>
                `
              : ''}
          </section>

          <section class="card panel" aria-labelledby="reviews-heading">
            <h2 id="reviews-heading">Recent reviews (${count})</h2>
            ${reviewData.reviews.length === 0
              ? html`<p class="muted">No reviews yet.</p>`
              : html`
                  <ul style="list-style:none;margin:0;padding:0;display:grid;gap:var(--s3)">
                    ${reviewData.reviews.map(
                      (rev) => html`
                        <li style="border-top:1px solid var(--mist);padding-top:var(--s3);display:grid;gap:var(--s1)">
                          <div style="display:flex;justify-content:space-between;gap:var(--s2);align-items:center">
                            <strong>${rev.authorName || 'Member'}</strong>
                            ${ratingStars(rev.rating, 1)}
                          </div>
                          <p>${rev.text}</p>
                        </li>
                      `,
                    )}
                  </ul>
                `}
          </section>
        </div>
      `,
    );

    outlet.querySelector('[data-edit-profile]')?.addEventListener('click', () => {
      draft = { name: profile.name, city: profile.city, photoUrl: profile.photoUrl || '' };
      errors = {};
      editing = true;
      paint();
    });
    outlet.querySelector('[data-cancel-edit]')?.addEventListener('click', () => {
      editing = false;
      paint();
    });

    const form = /** @type {HTMLFormElement | null} */ (outlet.querySelector('[data-profile-form]'));
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      draft = {
        name: String(fd.get('name') || '').trim(),
        city: String(fd.get('city') || '').trim(),
        photoUrl: String(fd.get('photoUrl') || '').trim(),
      };
      errors = validateProfileInput(draft);
      if (Object.keys(errors).length > 0) return paint();

      const btn = /** @type {HTMLButtonElement | null} */ (outlet.querySelector('[data-save-profile]'));
      if (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
      }
      try {
        const saved = await updateUserProfile(targetUid, draft);
        profile = { ...profile, ...saved };
        editing = false;
        showToast('Profile saved', { variant: 'success' });
        paint();
      } catch (err) {
        showToast(err.message, { variant: 'error' });
        if (btn) {
          btn.disabled = false;
          btn.removeAttribute('aria-busy');
        }
      }
    });
  }

  paint();
}
