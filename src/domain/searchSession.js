/**
 * Pure search pagination & session cache controller (testable without Firebase network).
 */
import { PAGE_SIZE } from '../config/constants.js';
import { isRangeInsideAvailability } from './dates.js';
import { filterListingsLocal, makeSearchCacheKey, normalizeSearchFilters } from './search.js';

/**
 * Create a search session cache + paginator over injected fetchers.
 * @param {object} deps
 * @param {(filters: any, cursorDoc: any) => Promise<{ items: any[], rawCount: number, lastDoc: any }>} deps.fetchPage
 * @param {(listingId: string, startDate: string, endDate: string) => Promise<boolean>} deps.isFreeForDates
 */
export function createSearchSession({ fetchPage, isFreeForDates }) {
  /** @type {Map<string, { items: any[], cursorDoc: any, hasMore: boolean }>} */
  const cache = new Map();

  function clear() {
    cache.clear();
  }

  function getCached(rawFilters = {}) {
    const filters = normalizeSearchFilters(rawFilters);
    return cache.get(makeSearchCacheKey(filters)) || null;
  }

  /**
   * Fetch first page (from cache unless bypassed) or append next page on `loadMore`.
   * @param {Record<string, any>} rawFilters
   * @param {{ loadMore?: boolean, useCache?: boolean }} [opts]
   */
  async function search(rawFilters = {}, opts = {}) {
    const filters = normalizeSearchFilters(rawFilters);
    const cacheKey = makeSearchCacheKey(filters);
    const existing = cache.get(cacheKey);

    if (opts.useCache !== false && !opts.loadMore && existing) {
      return existing;
    }

    const cursorDoc = opts.loadMore && existing ? existing.cursorDoc : null;
    const { items: rawItems, rawCount, lastDoc } = await fetchPage(filters, cursorDoc);
    let matched = filterListingsLocal(rawItems, filters);

    if (filters.startDate && filters.endDate && matched.length > 0) {
      const checks = await Promise.all(
        matched.map(async (item) => {
          if (!isRangeInsideAvailability(filters.startDate, filters.endDate, item.availability)) {
            return false;
          }
          return isFreeForDates(item.id, filters.startDate, filters.endDate);
        }),
      );
      matched = matched.filter((_, idx) => checks[idx]);
    }

    const combined = opts.loadMore && existing ? [...existing.items, ...matched] : matched;
    const nextState = {
      items: combined,
      cursorDoc: lastDoc || null,
      hasMore: rawCount === (filters.pageSize || PAGE_SIZE),
    };
    cache.set(cacheKey, nextState);
    return nextState;
  }

  return { search, getCached, clear };
}
