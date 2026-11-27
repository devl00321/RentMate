/**
 * Purpose: Create, read, update, pause, and soft-remove listings in Firestore.
 * Collections touched: listings/{id}.
 * Quota note: 1 read/write per listing op; owner queries bounded by limit(12); batch owner profile sync.
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { PAGE_SIZE } from '../config/constants.js';
import { AppError, ERROR_CODES } from '../config/errors.js';
import { initFirebase, trackRead, trackWrite } from '../config/firebase.js';
import { isValidListingStatus } from '../domain/listing.js';

/**
 * Map Firestore listing snapshot into plain object.
 * @param {string} id
 * @param {Record<string, any>} data
 */
export function toListingModel(id, data) {
  return {
    id,
    ownerId: data.ownerId || '',
    ownerName: data.ownerName || 'Owner',
    ownerPhoto: data.ownerPhoto || '',
    ownerRating: Number(data.ownerRating) || 0,
    ownerRatingCount: Number(data.ownerRatingCount) || 0,
    ownerVerified: Boolean(data.ownerVerified),
    title: data.title || '',
    description: data.description || '',
    category: data.category || '',
    photos: Array.isArray(data.photos) ? data.photos : [],
    dailyPaise: Number(data.dailyPaise) || 0,
    depositPaise: Number(data.depositPaise) || 0,
    city: data.city || '',
    availability: Array.isArray(data.availability) ? data.availability : [],
    status: data.status || 'active',
    isSample: Boolean(data.isSample),
  };
}

/**
 * Create a new listing document.
 * @param {Record<string, any>} payload
 */
export async function createListing(payload) {
  try {
    const { db } = await initFirebase();
    const ref = await addDoc(collection(db, 'listings'), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    trackWrite(1, 'listings.createListing');
    return { id: ref.id, ...payload };
  } catch (err) {
    throw mapListingError(err, 'Could not publish listing.');
  }
}

/**
 * Fetch a single listing by ID.
 * @param {string} id
 */
export async function getListing(id) {
  try {
    const { db } = await initFirebase();
    const snap = await getDoc(doc(db, 'listings', id));
    trackRead(1, 'listings.getListing');
    if (!snap.exists()) return null;
    return toListingModel(snap.id, snap.data());
  } catch (err) {
    throw mapListingError(err, 'Could not load listing.');
  }
}

/**
 * List listings owned by a user (bounded by limit(pageSize)).
 * @param {string} ownerId
 * @param {{ pageSize?: number }} [opts]
 */
export async function listOwnerListings(ownerId, { pageSize = PAGE_SIZE } = {}) {
  try {
    const { db } = await initFirebase();
    const q = query(
      collection(db, 'listings'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    );
    const snap = await getDocs(q);
    trackRead(Math.max(1, snap.size), 'listings.listOwnerListings');
    return snap.docs
      .map((d) => toListingModel(d.id, d.data()))
      .filter((item) => item.status !== 'removed');
  } catch (err) {
    throw mapListingError(err, 'Could not load your listings.');
  }
}

/**
 * Update editable fields on an existing listing.
 * @param {string} id
 * @param {Record<string, any>} patch
 */
export async function updateListing(id, patch) {
  try {
    const { db } = await initFirebase();
    await updateDoc(doc(db, 'listings', id), patch);
    trackWrite(1, 'listings.updateListing');
  } catch (err) {
    throw mapListingError(err, 'Could not save listing updates.');
  }
}

/**
 * Change listing status ('active', 'paused', or 'removed').
 * @param {string} id
 * @param {'active' | 'paused' | 'removed'} status
 */
export async function setListingStatus(id, status) {
  if (!isValidListingStatus(status)) {
    throw new AppError(ERROR_CODES.VALIDATION_INVALID, 'Invalid listing status.');
  }
  try {
    const { db } = await initFirebase();
    await updateDoc(doc(db, 'listings', id), { status });
    trackWrite(1, `listings.setStatus:${status}`);
  } catch (err) {
    throw mapListingError(err, 'Could not update listing status.');
  }
}

/**
 * Sync owner name and photo to active/paused listings in one batch (rules/03 s1 #2).
 * @param {string} ownerId
 * @param {{ name: string, photoUrl?: string }} profile
 */
export async function syncOwnerListingsProfile(ownerId, { name, photoUrl = '' }) {
  try {
    const { db } = await initFirebase();
    const q = query(collection(db, 'listings'), where('ownerId', '==', ownerId), limit(25));
    const snap = await getDocs(q);
    trackRead(Math.max(1, snap.size), 'listings.syncOwnerRead');
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { ownerName: name, ownerPhoto: photoUrl });
    });
    await batch.commit();
    trackWrite(snap.size, 'listings.syncOwnerWrite');
  } catch (err) {
    console.warn('Listing owner sync skipped:', err.message);
  }
}

/**
 * Map Firestore errors into AppError.
 * @param {unknown} err
 * @param {string} fallback
 * @returns {AppError}
 */
function mapListingError(err, fallback) {
  if (err instanceof AppError) return err;
  const code = /** @type {{ code?: string }} */ (err)?.code || '';
  if (code === 'permission-denied') {
    return new AppError(ERROR_CODES.AUTH_FORBIDDEN, 'You do not have permission to modify this listing.', err);
  }
  if (code === 'unavailable') {
    return new AppError(ERROR_CODES.NETWORK_OFFLINE, 'Network unavailable. Check connection and retry.', err);
  }
  return new AppError(ERROR_CODES.UNKNOWN, fallback, err);
}
