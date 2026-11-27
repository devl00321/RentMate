import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTargetDimensions, validateImageFile } from '../../src/domain/imageMath.js';
import { isCloudinaryConfigured, uploadImage } from '../../src/services/images.js';

test('computeTargetDimensions caps longest side without upscaling', () => {
  assert.deepEqual(computeTargetDimensions(3200, 1600, 1600), { width: 1600, height: 800 });
  assert.deepEqual(computeTargetDimensions(1200, 2400, 1600), { width: 800, height: 1600 });
  assert.deepEqual(computeTargetDimensions(800, 600, 1600), { width: 800, height: 600 });
});

test('validateImageFile rejects missing, non-image, or oversized files', () => {
  assert.equal(validateImageFile(null).ok, false);
  assert.equal(validateImageFile({ type: 'application/pdf', size: 100 }).ok, false);
  assert.equal(validateImageFile({ type: 'image/jpeg', size: 20 * 1024 * 1024 }).ok, false);
  assert.equal(validateImageFile({ type: 'image/jpeg', size: 500_000 }).ok, true);
});

test('uploadImage requires configured Cloudinary preset and posts FormData to v1_1 endpoint', async () => {
  assert.equal(isCloudinaryConfigured({ cloudinary: { cloudName: 'PLACEHOLDER_X', uploadPreset: 'p' } }), false);

  await assert.rejects(
    () =>
      uploadImage(new Blob(['fake'], { type: 'image/jpeg' }), {
        compress: false,
        envOverride: { cloudinary: { cloudName: 'PLACEHOLDER_CLOUD', uploadPreset: 'p' } },
      }),
    (err) => err.code === 'config/missing',
  );

  let calledUrl = '';
  let sentPreset = '';
  const fakeFetch = async (url, init) => {
    calledUrl = url;
    sentPreset = init.body.get('upload_preset');
    return {
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/cam.jpg' }),
    };
  };

  const res = await uploadImage(new Blob(['jpeg-bytes'], { type: 'image/jpeg' }), {
    compress: false,
    fetchImpl: fakeFetch,
    envOverride: { cloudinary: { cloudName: 'rentmate-demo', uploadPreset: 'rentmate_unsigned' } },
  });

  assert.equal(calledUrl, 'https://api.cloudinary.com/v1_1/rentmate-demo/image/upload');
  assert.equal(sentPreset, 'rentmate_unsigned');
  assert.equal(res.url, 'https://res.cloudinary.com/demo/image/upload/v1/cam.jpg');
});
