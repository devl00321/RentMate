import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDayInt,
  formatDayInt,
  countDays,
  enumerateStayDates,
  rangesOverlap,
  isRangeInsideAvailability,
  validateStayRange,
} from '../../src/domain/dates.js';

test('parseDayInt and formatDayInt handle valid and invalid calendar dates', () => {
  const day = parseDayInt('2026-12-01');
  assert.equal(Number.isFinite(day), true);
  assert.equal(formatDayInt(day), '2026-12-01');
  assert.equal(Number.isFinite(parseDayInt('2024-02-29')), true);
  assert.equal(Number.isNaN(parseDayInt('2026-02-29')), true);
  assert.equal(Number.isNaN(parseDayInt('2026-02-30')), true);
  assert.equal(Number.isNaN(parseDayInt('bad-date')), true);
});

test('countDays and enumerateStayDates use inclusive start and exclusive end', () => {
  assert.equal(countDays('2026-12-01', '2026-12-03'), 2);
  assert.equal(countDays('2026-12-03', '2026-12-03'), 0);
  assert.equal(countDays('2026-12-05', '2026-12-03'), 0);
  assert.deepEqual(enumerateStayDates('2026-12-01', '2026-12-04'), [
    '2026-12-01',
    '2026-12-02',
    '2026-12-03',
  ]);
});

test('rangesOverlap detects overlaps while allowing adjacent handover boundaries', () => {
  assert.equal(rangesOverlap('2026-12-01', '2026-12-05', '2026-12-03', '2026-12-07'), true);
  assert.equal(rangesOverlap('2026-12-01', '2026-12-05', '2026-12-05', '2026-12-08'), false);
  assert.equal(rangesOverlap('2026-12-05', '2026-12-08', '2026-12-01', '2026-12-05'), false);
});

test('isRangeInsideAvailability and validateStayRange enforce past dates and windows', () => {
  const windows = [{ start: '2026-12-01', end: '2026-12-20' }];
  assert.equal(isRangeInsideAvailability('2026-12-05', '2026-12-10', windows), true);
  assert.equal(isRangeInsideAvailability('2026-12-15', '2026-12-25', windows), false);

  assert.equal(validateStayRange('2026-11-25', '2026-12-02', windows, '2026-11-27').ok, false);
  assert.equal(validateStayRange('2026-12-05', '2026-12-08', windows, '2026-11-27').days, 3);
});
