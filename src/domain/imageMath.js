/**
 * Pure image sizing and file validation helpers.
 */
import { IMAGE_MAX_DIMENSION } from '../config/constants.js';

const MAX_RAW_BYTES = 15 * 1024 * 1024;

/**
 * Compute proportional target dimensions capped at `maxEdge` on the longest side.
 * Never upscales smaller images.
 * @param {number} width
 * @param {number} height
 * @param {number} [maxEdge]
 * @returns {{ width: number, height: number }}
 */
export function computeTargetDimensions(width, height, maxEdge = IMAGE_MAX_DIMENSION) {
  if (!width || !height || width <= 0 || height <= 0) {
    return { width: 0, height: 0 };
  }
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Validate a browser File before compression/upload.
 * @param {{ type?: string, size?: number, name?: string } | null | undefined} file
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateImageFile(file) {
  if (!file) return { ok: false, reason: 'Select an image file.' };
  if (!file.type || !file.type.startsWith('image/')) {
    return { ok: false, reason: 'Only image files (JPEG, PNG, WebP) are allowed.' };
  }
  if (typeof file.size === 'number' && file.size > MAX_RAW_BYTES) {
    return { ok: false, reason: 'Image must be 15 MB or smaller before compression.' };
  }
  return { ok: true };
}
