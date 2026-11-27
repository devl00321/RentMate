import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthGrid, classifyDayCell, rangeHasBookedDay } from '../../src/domain/calendarMath.js';

test('buildMonthGrid pads weeks cleanly for any month', () => {
  const dec = buildMonthGrid(2026, 11);
  assert.equal(dec.label, 'December 2026');
  assert.equal(dec.cells.length % 7, 0);
  const nonNull = dec.cells.filter(Boolean);
  assert.equal(nonNull.length, 31);
  assert.equal(nonNull[0].dateStr, '2026-12-01');
});

test('classifyDayCell identifies booked, unavailable, start, in-range, and end dates', () => {
  const availability = [{ start: '2026-12-01', end: '2026-12-20' }];
  const bookedSet = new Set(['2026-12-05', '2026-12-06']);

  assert.equal(
    classifyDayCell({ dateStr: '2026-11-26', todayStr: '2026-11-27', availability, bookedSet }).disabled,
    true,
  );
  const booked = classifyDayCell({ dateStr: '2026-12-05', todayStr: '2026-11-27', availability, bookedSet });
  assert.equal(booked.isBooked, true);
  assert.equal(booked.disabled, true);

  const validEnd = classifyDayCell({
    dateStr: '2026-12-04',
    todayStr: '2026-11-27',
    availability,
    bookedSet,
    startDate: '2026-12-02',
  });
  assert.equal(validEnd.disabled, false);

  const blockedCrossingEnd = classifyDayCell({
    dateStr: '2026-12-08',
    todayStr: '2026-11-27',
    availability,
    bookedSet,
    startDate: '2026-12-02',
  });
  assert.equal(blockedCrossingEnd.canEnd, false);
  assert.equal(blockedCrossingEnd.canStart, true);

  const inRange = classifyDayCell({
    dateStr: '2026-12-03',
    todayStr: '2026-11-27',
    availability,
    bookedSet,
    startDate: '2026-12-02',
    endDate: '2026-12-04',
  });
  assert.equal(inRange.isInRange, true);
});

test('rangeHasBookedDay detects booked nights accurately', () => {
  const booked = new Set(['2026-12-05']);
  assert.equal(rangeHasBookedDay('2026-12-02', '2026-12-05', booked), false);
  assert.equal(rangeHasBookedDay('2026-12-02', '2026-12-06', booked), true);
});
