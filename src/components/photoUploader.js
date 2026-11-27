/**
 * Reusable photo uploader component (max 5 for listings, 1 for handover/return).
 */
import { MAX_LISTING_PHOTOS } from '../config/constants.js';
import { uploadImage } from '../services/images.js';
import { html, renderHtml } from './dom.js';
import { showToast } from './toast.js';

/**
 * Mount a photo uploader into a container.
 * @param {Element} container
 * @param {{ photos: string[], maxPhotos?: number, labelPrefix?: string, onChange: (photos: string[]) => void }} opts
 */
export function mountPhotoUploader(container, opts) {
  const maxPhotos = opts.maxPhotos || MAX_LISTING_PHOTOS;
  const labelPrefix = opts.labelPrefix || 'Item';
  let photos = [...(opts.photos || [])];
  let uploading = false;

  function paint() {
    const remaining = Math.max(0, maxPhotos - photos.length);
    renderHtml(
      container,
      html`
        <div class="uploader" data-uploader>
          <div class="uploader__bar">
            <label class="btn btn--ghost" for="photo-file-input" aria-disabled="${String(uploading || remaining === 0)}">
              ${uploading ? 'Compressing & uploading...' : `Add photos (${photos.length}/${maxPhotos})`}
            </label>
            <input
              id="photo-file-input"
              class="sr-only"
              type="file"
              accept="image/*"
              ${maxPhotos > 1 ? 'multiple' : ''}
              ${uploading || remaining === 0 ? 'disabled' : ''}
              data-file-input
            >
            <span class="muted">Auto-compressed to max 1600px JPEG.</span>
          </div>

          ${photos.length > 0
            ? html`
                <div class="uploader__grid">
                  ${photos.map(
                    (url, idx) => html`
                      <figure class="uploader__item card">
                        <img src="${url}" alt="${labelPrefix} photo ${idx + 1}" width="160" height="120" loading="lazy">
                        <button type="button" class="btn btn--ghost uploader__remove" data-remove-photo="${idx}" aria-label="Remove photo ${idx + 1}">Remove</button>
                      </figure>
                    `,
                  )}
                </div>
              `
            : ''}
        </div>
      `,
    );

    const fileInput = /** @type {HTMLInputElement | null} */ (container.querySelector('[data-file-input]'));
    fileInput?.addEventListener('change', async () => {
      const files = Array.from(fileInput.files || []).slice(0, maxPhotos - photos.length);
      if (!files.length) return;
      uploading = true;
      paint();
      try {
        for (const file of files) {
          const result = await uploadImage(file);
          photos.push(result.url);
        }
        opts.onChange([...photos]);
        showToast(`${files.length} photo${files.length === 1 ? '' : 's'} uploaded`, { variant: 'success' });
      } catch (err) {
        showToast(err.message || 'Photo upload failed.', { variant: 'error' });
      } finally {
        uploading = false;
        paint();
      }
    });

    container.querySelectorAll('[data-remove-photo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-remove-photo'));
        photos = photos.filter((_, i) => i !== idx);
        opts.onChange([...photos]);
        paint();
      });
    });
  }

  paint();
  return { getPhotos: () => [...photos] };
}
