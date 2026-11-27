/**
 * Purpose: Compress photos in-browser (<1600px JPEG) and upload via Cloudinary unsigned preset.
 * Collections touched: none (returns HTTPS URL for caller to store in Firestore).
 * Quota note: 0 Firestore reads/writes; avoids Firebase Storage on Spark (OB-3).
 */
import { IMAGE_JPEG_QUALITY, IMAGE_MAX_DIMENSION } from '../config/constants.js';
import { AppError, ERROR_CODES } from '../config/errors.js';
import { loadEnv } from '../config/env.js';
import { computeTargetDimensions, validateImageFile } from '../domain/imageMath.js';

/**
 * Decode an image File into drawable source + dimensions.
 * @param {File | Blob} file
 * @returns {Promise<{ source: CanvasImageSource, width: number, height: number, cleanup: () => void }>}
 */
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(file);
    return {
      source: bmp,
      width: bmp.width,
      height: bmp.height,
      cleanup: () => bmp.close?.(),
    };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image.'));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/**
 * Compress an image File to JPEG capped at maxEdge on longest side.
 * @param {File | Blob} file
 * @param {{ maxEdge?: number, quality?: number }} [opts]
 * @returns {Promise<Blob>}
 */
export async function compressImage(
  file,
  { maxEdge = IMAGE_MAX_DIMENSION, quality = IMAGE_JPEG_QUALITY } = {},
) {
  const check = validateImageFile(file);
  if (!check.ok) {
    throw new AppError(ERROR_CODES.VALIDATION_INVALID, check.reason || 'Invalid image.');
  }

  let decoded;
  try {
    decoded = await decodeImage(file);
    const { width, height } = computeTargetDimensions(decoded.width, decoded.height, maxEdge);
    if (!width || !height) {
      throw new AppError(ERROR_CODES.VALIDATION_INVALID, 'Image dimensions are invalid.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new AppError(ERROR_CODES.UNKNOWN, 'Canvas 2D context unavailable.');
    ctx.drawImage(decoded.source, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new AppError(ERROR_CODES.UPLOAD_FAILED, 'Could not compress image.');
    return blob;
  } finally {
    decoded?.cleanup();
  }
}

/**
 * Check if Cloudinary unsigned upload preset is configured.
 * @param {any} env
 * @returns {boolean}
 */
export function isCloudinaryConfigured(env) {
  const cloud = env?.cloudinary?.cloudName || '';
  const preset = env?.cloudinary?.uploadPreset || '';
  return Boolean(
    cloud &&
    preset &&
    !String(cloud).startsWith('PLACEHOLDER_') &&
    !String(preset).startsWith('PLACEHOLDER_'),
  );
}

/**
 * Convert a Blob to a base64 Data URL (used only in local emulator mode when Cloudinary is unconfigured).
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read compressed image.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compress (when in browser) and upload an image file to Cloudinary unsigned upload API.
 * In local emulator mode without Cloudinary keys, stores a compact compressed JPEG data URL locally.
 * @param {File | Blob} file
 * @param {{ fetchImpl?: typeof fetch, compress?: boolean, envOverride?: any }} [opts]
 * @returns {Promise<{ url: string, bytes: number, isLocalTest?: boolean }>}
 */
export async function uploadImage(file, opts = {}) {
  const check = validateImageFile(file);
  if (!check.ok) {
    throw new AppError(ERROR_CODES.VALIDATION_INVALID, check.reason || 'Invalid image.');
  }

  const env = opts.envOverride || (await loadEnv());
  if (!isCloudinaryConfigured(env)) {
    if (env?.useEmulator) {
      const localBlob = opts.compress === false ? file : await compressImage(file, { maxEdge: 800, quality: 0.72 });
      const dataUrl = await blobToDataUrl(localBlob);
      return { url: dataUrl, bytes: localBlob.size || 0, isLocalTest: true };
    }
    throw new AppError(
      ERROR_CODES.CONFIG_MISSING,
      'Cloudinary cloudName and unsigned uploadPreset are not configured in config.local.js.',
    );
  }

  const payloadBlob = opts.compress === false ? file : await compressImage(file);
  const { cloudName, uploadPreset } = env.cloudinary;
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;

  const formData = new FormData();
  formData.append('file', payloadBlob, 'upload.jpg');
  formData.append('upload_preset', uploadPreset);

  const doFetch = opts.fetchImpl || fetch;
  try {
    const res = await doFetch(endpoint, { method: 'POST', body: formData });
    if (!res.ok) {
      throw new AppError(ERROR_CODES.UPLOAD_FAILED, `Image upload failed (${res.status}).`);
    }
    const data = await res.json();
    if (!data?.secure_url) {
      throw new AppError(ERROR_CODES.UPLOAD_FAILED, 'Image host did not return a secure URL.');
    }
    return { url: data.secure_url, bytes: payloadBlob.size || 0 };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERROR_CODES.NETWORK_OFFLINE, 'Could not upload image. Check connection and retry.', err);
  }
}
