import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchSession } from '../../src/domain/searchSession.js';
import { SAMPLE_LISTINGS } from '../../src/config/seedListings.js';

test('searchSession excludes booked items on date filter (M4.2)', async () => {
  const bookedIds = new Set([SAMPLE_LISTINGS[0].id]);
  let checkCount = 0;

  const session = createSearchSession({
    async fetchPage() {
      return {
        items: SAMPLE_LISTINGS.slice(0, 3),
        rawCount: 3,
        lastDoc: null,
      };
    },
    async isFreeForDates(id) {
      checkCount += 1;
      return !bookedIds.has(id);
    },
  });

  const res = await session.search({ startDate: '2026-12-05', endDate: '2026-12-07' });
  assert.equal(checkCount, 3);
  assert.equal(res.items.length, 2);
  assert.equal(res.items.some((i) => i.id === SAMPLE_LISTINGS[0].id), false);
});

test('searchSession paginates with cursor and caches pages without refetch on back (M4.3)', async () => {
  let fetchCalls = 0;
  const page1 = SAMPLE_LISTINGS.slice(0, 12);
  const page2 = [{ ...SAMPLE_LISTINGS[0], id: 'extra-13' }];

  const session = createSearchSession({
    async fetchPage(_filters, cursor) {
      fetchCalls += 1;
      if (!cursor) return { items: page1, rawCount: 12, lastDoc: 'cursor-12' };
      return { items: page2, rawCount: 1, lastDoc: 'cursor-13' };
    },
    async isFreeForDates() {
      return true;
    },
  });

  const first = await session.search({ category: '' });
  assert.equal(fetchCalls, 1);
  assert.equal(first.items.length, 12);
  assert.equal(first.hasMore, true);

  // Back navigation with same filters hits session cache (0 fetches)
  const cached = await session.search({ category: '' });
  assert.equal(fetchCalls, 1);
  assert.equal(cached.items.length, 12);

  // Load more fetches page 2 and appends
  const more = await session.search({ category: '' }, { loadMore: true });
  assert.equal(fetchCalls, 2);
  assert.equal(more.items.length, 13);
  assert.equal(more.hasMore, false);

  session.clear();
  await session.search({ category: '' });
  assert.equal(fetchCalls, 3);
});
