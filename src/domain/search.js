/**
 * Pure search query planner, client-side filter/sort helpers, and cache key builder.
 */
import { CATEGORIES, LISTING_STATUS, PAGE_SIZE } from '../config/constants.js';
import { isRangeInsideAvailability } from './dates.js';

/**
 * Normalize raw search form filters into clean values (paise for money).
 * @param {Record<string, any>} raw
 */
export function normalizeSearchFilters(raw = {}) {
  const category = CATEGORIES.includes(raw.category) ? raw.category : '';
  const city = String(raw.city || '').trim();
  const q = String(raw.q || '').trim();
  const minRupees = Number(raw.minRupees);
  const maxRupees = Number(raw.maxRupees);
  const minPaise = Number.isFinite(minRupees) && minRupees > 0 ? Math.round(minRupees * 100) : null;
  const maxPaise = Number.isFinite(maxRupees) && maxRupees > 0 ? Math.round(maxRupees * 100) : null;
  const startDate = String(raw.startDate || '').trim();
  const endDate = String(raw.endDate || '').trim();
  const sort = ['price-asc', 'price-desc', 'newest'].includes(raw.sort) ? raw.sort : 'newest';

  return {
    category,
    city,
    cityLower: city.toLowerCase(),
    q,
    minPaise,
    maxPaise,
    startDate,
    endDate,
    sort,
    pageSize: PAGE_SIZE,
  };
}

/**
 * Build Firestore constraint plan (always bounded by PAGE_SIZE = 12).
 * @param {ReturnType<typeof normalizeSearchFilters>} filters
 */
export function buildSearchPlan(filters) {
  /** @type {Array<{ field: string, op: string, value: any }>} */
  const whereClauses = [{ field: 'status', op: '==', value: LISTING_STATUS.ACTIVE }];
  if (filters.category) {
    whereClauses.push({ field: 'category', op: '==', value: filters.category });
  }
  if (filters.cityLower) {
    whereClauses.push({ field: 'cityLower', op: '==', value: filters.cityLower });
  }

  const hasPriceBound = filters.minPaise !== null || filters.maxPaise !== null;
  if (filters.minPaise !== null) {
    whereClauses.push({ field: 'dailyPaise', op: '>=', value: filters.minPaise });
  }
  if (filters.maxPaise !== null) {
    whereClauses.push({ field: 'dailyPaise', op: '<=', value: filters.maxPaise });
  }

  let orderByField = 'createdAt';
  let orderByDir = 'desc';
  if (hasPriceBound || filters.sort === 'price-asc') {
    orderByField = 'dailyPaise';
    orderByDir = filters.sort === 'price-desc' ? 'desc' : 'asc';
  } else if (filters.sort === 'price-desc') {
    orderByField = 'dailyPaise';
    orderByDir = 'desc';
  }

  return {
    whereClauses,
    orderBy: { field: orderByField, dir: orderByDir },
    limitCount: filters.pageSize || PAGE_SIZE,
  };
}

/**
 * Apply keyword and availability-window filtering (and fallback sort) in memory.
 * @param {any[]} items
 * @param {ReturnType<typeof normalizeSearchFilters>} filters
 */
export function filterListingsLocal(items, filters) {
  const kw = filters.q.toLowerCase();
  const hasDates = Boolean(filters.startDate && filters.endDate);

  const filtered = items.filter((item) => {
    if (item.status && item.status !== LISTING_STATUS.ACTIVE) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.cityLower && String(item.city || '').toLowerCase() !== filters.cityLower) return false;
    if (filters.minPaise !== null && item.dailyPaise < filters.minPaise) return false;
    if (filters.maxPaise !== null && item.dailyPaise > filters.maxPaise) return false;
    if (kw) {
      const hay = `${item.title || ''} ${item.description || ''} ${item.category || ''}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    if (hasDates && !isRangeInsideAvailability(filters.startDate, filters.endDate, item.availability)) {
      return false;
    }
    return true;
  });

  if (filters.sort === 'price-asc') {
    return [...filtered].sort((a, b) => a.dailyPaise - b.dailyPaise);
  }
  if (filters.sort === 'price-desc') {
    return [...filtered].sort((a, b) => b.dailyPaise - a.dailyPaise);
  }
  return filtered;
}

/**
 * Build deterministic session cache key for a filter set.
 * @param {ReturnType<typeof normalizeSearchFilters>} filters
 * @returns {string}
 */
export function makeSearchCacheKey(filters) {
  return JSON.stringify([
    filters.category,
    filters.cityLower,
    filters.q.toLowerCase(),
    filters.minPaise,
    filters.maxPaise,
    filters.startDate,
    filters.endDate,
    filters.sort,
  ]);
}
