import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildNewProfilePayload, buildProfileUpdatePayload } from '../../src/domain/profile.js';
import { verifiedBadge } from '../../src/components/verifiedBadge.js';

test('buildNewProfilePayload forces non-privileged defaults', () => {
  const payload = buildNewProfilePayload({
    name: 'Asha Rao',
    city: 'Bengaluru',
    role: 'admin',
    verified: true,
    ratingAvg: 5,
    ratingCount: 99,
  });
  assert.equal(payload.role, 'user');
  assert.equal(payload.verified, false);
  assert.equal(payload.ratingAvg, 0);
  assert.equal(payload.ratingCount, 0);
  assert.equal(payload.name, 'Asha Rao');
});

test('buildProfileUpdatePayload strips role, verified, and rating fields', () => {
  const clean = buildProfileUpdatePayload({
    name: 'Asha',
    city: 'Pune',
    photoUrl: 'https://example.com/a.jpg',
    role: 'admin',
    verified: true,
    ratingAvg: 5,
    ratingCount: 10,
  });
  assert.deepEqual(clean, {
    name: 'Asha',
    city: 'Pune',
    photoUrl: 'https://example.com/a.jpg',
  });
  assert.equal('verified' in clean, false);
  assert.equal('role' in clean, false);
});

test('firestore.rules blocks client writes to role, verified, ratingAvg, ratingCount', () => {
  const rules = fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  assert.ok(rules.includes("hasAny(['role', 'verified', 'ratingAvg', 'ratingCount', 'createdAt'])"));
  assert.ok(rules.includes("request.resource.data.role == 'user'"));
  assert.ok(rules.includes('request.resource.data.verified == false'));
});

test('verifiedBadge renders verified status only when true', () => {
  assert.ok(verifiedBadge(true).toString().includes('Verified'));
  assert.equal(verifiedBadge(false), '');
  assert.ok(verifiedBadge(false, true).toString().includes('Unverified'));
});
