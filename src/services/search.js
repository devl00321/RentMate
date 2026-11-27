/**
 * Purpose: Paginated, quota-bounded listing search queries and session page cache.
 * Collections touched: listings/{id}, listings/{id}/bookedDays/{YYYY-MM-DD}.
 * Quota note: max 12 listing reads per page + max 1 limit(1) bookedDays check per candidate when dates set.
 */
import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { PAGE_SIZE } from '../config/constants.js';
import { AppError, ERROR_CODES } from '../config/errors.js';
import { initFirebase, trackRead } from '../config/firebase.js';
import { buildSearchPlan } from '../domain/search.js';
import { createSearchSession } from '../domain/searchSession.js';
import { toListingModel } from './listings.js';

/**
 * Check whether a listing has zero conflicting `bookedDays` locks in `[startDate, endDate)`.
 * @param {any} db
 * @param {string} listingId
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<boolean>}
 */
export async function isListingFreeForDates(db, listingId, startDate, endDate) {
  const q = query(
    collection(db, 'listings', listingId, 'bookedDays'),
    where(documentId(), '>=', startDate),
    where(documentId(), '<', endDate),
    limit(1),
  );
  const snap = await getDocs(q);
  trackRead(1, 'search.bookedDaysCheck');
  return snap.empty;
}

const session = createSearchSession({
  async fetchPage(filters, cursorDoc) {
    const { db } = await initFirebase();
    const plan = buildSearchPlan(filters);
    const constraints = plan.whereClauses.map((c) => where(c.field, /** @type {any} */ (c.op), c.value));
    constraints.push(orderBy(plan.orderBy.field, /** @type {any} */ (plan.orderBy.dir)));
    if (cursorDoc) constraints.push(startAfter(cursorDoc));
    constraints.push(limit(plan.limitCount || PAGE_SIZE));

    const snap = await getDocs(query(collection(db, 'listings'), ...constraints));
    trackRead(Math.max(1, snap.size), 'search.listingsPage');
    return {
      items: snap.docs.map((d) => toListingModel(d.id, d.data())),
      rawCount: snap.size,
      lastDoc: snap.docs[snap.docs.length - 1] || null,
    };
  },
  async isFreeForDates(listingId, startDate, endDate) {
    const { db } = await initFirebase();
    return isListingFreeForDates(db, listingId, startDate, endDate);
  },
});

export const clearSearchCache = () => session.clear();
export const getCachedSearch = (rawFilters) => session.getCached(rawFilters);

/**
 * Execute a bounded listing search page (`limit(12)`), using session cache when valid.
 * @param {Record<string, any>} rawFilters
 * @param {{ loadMore?: boolean, useCache?: boolean }} [opts]
 */
export async function searchListings(rawFilters = {}, opts = {}) {
  try {
    return await session.search(rawFilters, opts);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERROR_CODES.NETWORK_OFFLINE, 'Could not load search results. Retry when connected.', err);
  }
}
