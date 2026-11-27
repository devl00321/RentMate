import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSearchFilters,
  buildSearchPlan,
  filterListingsLocal,
  makeSearchCacheKey,
} from '../../src/domain/search.js';
import { SAMPLE_LISTINGS } from '../../src/config/seedListings.js';

test('buildSearchPlan enforces status active, limit(12), and filters', () => {
  const f = normalizeSearchFilters({
    category: 'Cameras & Lenses',
    city: ' Bengaluru ',
    minRupees: '300',
    maxRupees: '1500',
    sort: 'price-asc',
  });
  const plan = buildSearchPlan(f);
  assert.equal(plan.limitCount, 12);
  assert.equal(plan.orderBy.field, 'dailyPaise');
  assert.equal(plan.orderBy.dir, 'asc');
  assert.deepEqual(plan.whereClauses, [
    { field: 'status', op: '==', value: 'active' },
    { field: 'category', op: '==', value: 'Cameras & Lenses' },
    { field: 'cityLower', op: '==', value: 'bengaluru' },
    { field: 'dailyPaise', op: '>=', value: 30000 },
    { field: 'dailyPaise', op: '<=', value: 150000 },
  ]);
});

test('filterListingsLocal filters by category, city, price, keyword, and availability dates', () => {
  const filters = normalizeSearchFilters({
    city: 'Bengaluru',
    maxRupees: '1200',
    startDate: '2026-12-05',
    endDate: '2026-12-08',
    sort: 'price-asc',
  });
  const results = filterListingsLocal([...SAMPLE_LISTINGS], filters);
  assert.ok(results.length > 0);
  assert.ok(results.every((r) => r.city === 'Bengaluru' && r.dailyPaise <= 120000));
  for (let i = 1; i < results.length; i += 1) {
    assert.ok(results[i - 1].dailyPaise <= results[i].dailyPaise);
  }

  const outOfRange = filterListingsLocal(
    [...SAMPLE_LISTINGS],
    normalizeSearchFilters({ startDate: '2027-02-01', endDate: '2027-02-04' }),
  );
  assert.equal(outOfRange.length, 0);
});

test('makeSearchCacheKey produces stable cache keys regardless of case/spacing', () => {
  const k1 = makeSearchCacheKey(normalizeSearchFilters({ city: ' Pune ', q: 'Drill' }));
  const k2 = makeSearchCacheKey(normalizeSearchFilters({ city: 'pune', q: 'drill' }));
  assert.equal(k1, k2);
});
