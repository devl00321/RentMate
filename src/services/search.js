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
import { isRangeInsideAvailability } from '../domain/dates.js';
import { buildSearchPlan, filterListingsLocal, makeSearchCacheKey, normalizeSearchFilters } from '../domain/search.js';
import { toListingModel } from './listings.js';

/** @type {Map<string, { items: any[], cursorDoc: any, hasMore: boolean }>} */
const sessionCache = new Map();

/**
 * Clear in-memory search session cache (call after creating/updating listings or bookings).
 */
export function clearSearchCache() {
  sessionCache.clear();
}

/**
 * Return cached search state if present for these filters (no network reads).
 * @param {Record<string, any>} rawFilters
 */
export function getCachedSearch(rawFilters) {
  const filters = normalizeSearchFilters(rawFilters);
  return sessionCache.get(makeSearchCacheKey(filters)) || null;
}

/**
 * Check whether a listing has zero conflicting `bookedDays` locks in `[startDate, endDate)`.
 * Costs at most 1 bounded query (`limit(1)`).
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

/**
 * Execute a bounded listing search page (`limit(12)`), optionally checking bookedDays locks.
 * Uses session cache when `useCache` is true and no `loadMore` requested.
 * @param {Record<string, any>} rawFilters
 * @param {{ loadMore?: boolean, useCache?: boolean }} [opts]
 */
export async function searchListings(rawFilters = {}, opts = {}) {
  const filters = normalizeSearchFilters(rawFilters);
  const cacheKey = makeSearchCacheKey(filters);
  const existing = sessionCache.get(cacheKey);

  if (opts.useCache !== false && !opts.loadMore && existing) {
    return existing;
  }

  const cursorDoc = opts.loadMore && existing ? existing.cursorDoc : null;

  try {
    const { db } = await initFirebase();
    const plan = buildSearchPlan(filters);
    const constraints = plan.whereClauses.map((c) => where(c.field, /** @type {any} */ (c.op), c.value));
    constraints.push(orderBy(plan.orderBy.field, /** @type {any} */ (plan.orderBy.dir)));
    if (cursorDoc) constraints.push(startAfter(cursorDoc));
    constraints.push(limit(plan.limitCount || PAGE_SIZE));

    const snap = await getDocs(query(collection(db, 'listings'), ...constraints));
    trackRead(Math.max(1, snap.size), 'search.listingsPage');

    const rawItems = snap.docs.map((d) => toListingModel(d.id, d.data()));
    let matched = filterListingsLocal(rawItems, filters);

    if (filters.startDate && filters.endDate && matched.length > 0) {
      const checks = await Promise.all(
        matched.map(async (item) => {
          if (!isRangeInsideAvailability(filters.startDate, filters.endDate, item.availability)) {
            return false;
          }
          return isListingFreeForDates(db, item.id, filters.startDate, filters.endDate);
        }),
      );
      matched = matched.filter((_, idx) => checks[idx]);
    }

    const combined = opts.loadMore && existing ? [...existing.items, ...matched] : matched;
    const nextState = {
      items: combined,
      cursorDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === (plan.limitCount || PAGE_SIZE),
    };
    sessionCache.set(cacheKey, nextState);
    return nextState;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ERROR_CODES.NETWORK_OFFLINE, 'Could not load search results. Retry when connected.', err);
  }
}
