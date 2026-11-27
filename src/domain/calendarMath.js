/**
 * Pure calendar grid and availability/booked-day classification helpers (M5.3).
 */
import { enumerateStayDates, formatDayInt, getTodayDateStr, isRangeInsideAvailability, parseDayInt } from './dates.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Build a 7-column month grid (`cells` has `null` padding or `{ dateStr, dayNum }`).
 * @param {number} year
 * @param {number} monthIndex - 0..11
 */
export function buildMonthGrid(year, monthIndex) {
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const startDow = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells = [];

  for (let i = 0; i < startDow; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const m = String(monthIndex + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    cells.push({ dateStr: `${year}-${m}-${dayStr}`, dayNum: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return {
    year,
    monthIndex,
    label: `${MONTH_NAMES[monthIndex]} ${year}`,
    cells,
  };
}

/**
 * Check if any night in `[startDate, endDate)` is booked.
 * @param {string} startDate
 * @param {string} endDate
 * @param {Set<string>} bookedSet
 * @returns {boolean}
 */
export function rangeHasBookedDay(startDate, endDate, bookedSet) {
  const days = enumerateStayDates(startDate, endDate);
  if (days.length === 0) return false;
  return days.some((d) => bookedSet.has(d));
}

/**
 * Classify a calendar cell for display and clickability.
 * @param {object} opts
 * @param {string} opts.dateStr
 * @param {string} [opts.todayStr]
 * @param {Array<{ start: string, end: string }>} opts.availability
 * @param {Set<string>} opts.bookedSet
 * @param {string} [opts.startDate]
 * @param {string} [opts.endDate]
 */
export function classifyDayCell({
  dateStr,
  todayStr = getTodayDateStr(),
  availability = [],
  bookedSet = new Set(),
  startDate = '',
  endDate = '',
}) {
  const isPast = dateStr < todayStr;
  const isBooked = bookedSet.has(dateStr);
  const nextDay = formatDayInt(parseDayInt(dateStr) + 1);
  const canStartHere = !isPast && !isBooked && isRangeInsideAvailability(dateStr, nextDay, availability);

  let canEndHere = false;
  if (startDate && !endDate && dateStr > startDate) {
    canEndHere =
      !isPast &&
      isRangeInsideAvailability(startDate, dateStr, availability) &&
      !rangeHasBookedDay(startDate, dateStr, bookedSet);
  }

  const isStart = Boolean(startDate && dateStr === startDate);
  const isEnd = Boolean(endDate && dateStr === endDate);
  const isInRange = Boolean(startDate && endDate && dateStr > startDate && dateStr < endDate);

  return {
    isPast,
    isBooked,
    isStart,
    isEnd,
    isInRange,
    canStart: canStartHere,
    canEnd: canEndHere,
    disabled: !(canStartHere || canEndHere),
  };
}
