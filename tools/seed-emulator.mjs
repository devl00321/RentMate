/**
 * Idempotently seeds Auth + Firestore Emulators with 3 demo accounts and 12 sample listings.
 * Safe to run on startup: skips seeding if listings already exist.
 */
import { SAMPLE_LISTINGS } from '../src/config/seedListings.js';

const AUTH_BASE = process.env.AUTH_EMULATOR_URL || 'http://127.0.0.1:9099';
const FS_BASE = process.env.FIRESTORE_EMULATOR_URL || 'http://127.0.0.1:8081';
const PROJECT = 'demo-rentmate';
const FS_DOC_BASE = `${FS_BASE}/v1/projects/${PROJECT}/databases/(default)/documents`;

const DEMO_USERS = [
  { email: 'owner@rentmate.test', password: 'rentmate123', name: 'Asha (Sample Owner)', city: 'Bengaluru', verified: true, role: 'user', avg: 4.9, count: 12 },
  { email: 'renter@rentmate.test', password: 'rentmate123', name: 'Ravi (Sample Renter)', city: 'Bengaluru', verified: true, role: 'user', avg: 4.8, count: 6 },
  { email: 'admin@rentmate.test', password: 'rentmate123', name: 'RentMate Admin', city: 'Bengaluru', verified: true, role: 'admin', avg: 0, count: 0 },
];

function toFsValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFsValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFsValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function ensureAuthUser(u) {
  let res = await fetch(`${AUTH_BASE}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-rentmate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, password: u.password, displayName: u.name, returnSecureToken: true }),
  });
  let data = await res.json();
  if (!res.ok) {
    res = await fetch(`${AUTH_BASE}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-rentmate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, password: u.password, returnSecureToken: true }),
    });
    data = await res.json();
  }
  return data.localId;
}

async function writeDocAdmin(path, obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFsValue(v);
  fields.createdAt = { timestampValue: new Date().toISOString() };
  const res = await fetch(`${FS_DOC_BASE}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Failed seeding ${path}: ${res.status}`);
}

async function main() {
  const listRes = await fetch(`${FS_DOC_BASE}/listings?pageSize=1`, {
    headers: { Authorization: 'Bearer owner' },
  });
  const listJson = await listRes.json();
  if (Array.isArray(listJson.documents) && listJson.documents.length > 0) {
    console.log('Seed check: emulator already has listings; skipping.');
    return;
  }

  let ownerUid = '';
  for (const u of DEMO_USERS) {
    const uid = await ensureAuthUser(u);
    if (!uid) continue;
    if (u.email.startsWith('owner@')) ownerUid = uid;
    await writeDocAdmin(`users/${uid}`, {
      name: u.name,
      city: u.city,
      photoUrl: '',
      verified: u.verified,
      role: u.role,
      ratingAvg: u.avg,
      ratingCount: u.count,
    });
  }

  for (const item of SAMPLE_LISTINGS) {
    const { id, ...rest } = item;
    await writeDocAdmin(`listings/${id}`, {
      ...rest,
      ownerId: ownerUid || 'sample-owner',
      ownerPhoto: '',
    });
  }
  console.log(`Seeded ${DEMO_USERS.length} demo accounts and ${SAMPLE_LISTINGS.length} sample listings.`);
}

main().catch((err) => {
  console.error('Emulator seed error:', err.message);
  process.exit(1);
});
