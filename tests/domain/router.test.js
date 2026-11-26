import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, matchRoute } from '../../src/router.js';

const ROUTES = [
  { path: '/' },
  { path: '/search' },
  { path: '/listing/:id' },
  { path: '/demo' },
];

test('parseHash normalizes paths and extracts query params', () => {
  assert.deepEqual(parseHash(''), { path: '/', query: {} });
  assert.deepEqual(parseHash('#/'), { path: '/', query: {} });
  assert.deepEqual(parseHash('#/search/?q=camera&city=Pune'), {
    path: '/search',
    query: { q: 'camera', city: 'Pune' },
  });
});

test('matchRoute matches static, parameterized, and unknown routes', () => {
  const home = matchRoute('#/', ROUTES);
  assert.equal(home?.path, '/');

  const listing = matchRoute('#/listing/cam-123', ROUTES);
  assert.equal(listing?.route.path, '/listing/:id');
  assert.equal(listing?.params.id, 'cam-123');

  const missing = matchRoute('#/unknown/path', ROUTES);
  assert.equal(missing, null);
});
