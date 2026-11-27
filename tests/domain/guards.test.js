import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeNextPath,
  requireAuth,
  requireAdmin,
  canActInBothRoles,
} from '../../src/domain/guards.js';

test('sanitizeNextPath prevents open redirects', () => {
  assert.equal(sanitizeNextPath('/dashboard'), '/dashboard');
  assert.equal(sanitizeNextPath('//evil.com'), '/');
  assert.equal(sanitizeNextPath('https://evil.com'), '/');
  assert.equal(sanitizeNextPath('javascript:alert(1)'), '/');
  assert.equal(sanitizeNextPath(undefined), '/');
});

test('requireAuth redirects signed-out users and allows signed-in users for both roles', () => {
  assert.equal(requireAuth({ user: null, path: '/dashboard' }), '/auth?next=%2Fdashboard');
  const user = { uid: 'user-123' };
  assert.equal(requireAuth({ user, path: '/dashboard' }), null);
  assert.equal(requireAuth({ user, path: '/list' }), null);
  assert.equal(canActInBothRoles(user), true);
  assert.equal(canActInBothRoles(null), false);
});

test('requireAdmin blocks non-admins and allows admins', () => {
  assert.equal(requireAdmin({ user: null, path: '/admin' }), '/auth?next=%2Fadmin');
  assert.equal(requireAdmin({ user: { uid: 'u1' }, profile: { role: 'user' }, path: '/admin' }), '/');
  assert.equal(requireAdmin({ user: { uid: 'a1' }, profile: { role: 'admin' }, path: '/admin' }), null);
});
