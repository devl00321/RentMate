/**
 * Pure integer date math for RentMate (Decision D-007, OQ-010: Asia/Kolkata).
 * Convention: inclusive startDate, exclusive endDate (`YYYY-MM-DD`).
 */
import { TIMEZONE } from '../config/constants.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a YYYY-MM-DD string into integer UTC day number (days since Unix epoch).
 * Returns NaN if invalid calendar date (e.g. 2026-02-30).
 * @param {string} dateStr
 * @returns {number}
 */
export function parseDayInt(dateStr) {
  if (!ISO_DATE_RE.test(String(dateStr || ''))) return NaN;
  const [y, m, d] = dateStr.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return NaN;
  }
  return Math.floor(ms / 86400000);
}

/**
 * Format an integer UTC day number back to `YYYY-MM-DD`.
 * @param {number} dayInt
 * @returns {string}
 */
export function formatDayInt(dayInt) {
  const dt = new Date(dayInt * 86400000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get today's YYYY-MM-DD string in configured timezone (Asia/Kolkata).
 * @param {Date} [now]
 * @returns {string}
 */
export function getTodayDateStr(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

/**
 * Count whole rental days (inclusive start, exclusive end). Returns 0 if invalid.
 * @param {string} startDate
 * @param {string} endDate
 * @returns {number}
 */
export function countDays(startDate, endDate) {
  const a = parseDayInt(startDate);
  const b = parseDayInt(endDate);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return b - a;
}

/**
 * Enumerate every locked night/day string in `[startDate, endDate)` (max 90 days guard).
 * @param {string} startDate
 * @param {string} endDate
 * @returns {string[]}
 */
export function enumerateStayDates(startDate, endDate) {
  const a = parseDayInt(startDate);
  const b = parseDayInt(endDate);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a || b - a > 90) return [];
  const days = [];
  for (let d = a; d < b; d += 1) {
    days.push(formatDayInt(d));
  }
  return days;
}

/**
 * Check if two half-open intervals `[aStart, aEnd)` and `[bStart, bEnd)` overlap.
 * Touching boundaries (`aEnd === bStart`) do NOT overlap.
 * @param {string} aStart
 * @param {string} aEnd
 * @param {string} bStart
 * @param {string} bEnd
 * @returns {boolean}
 */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const a1 = parseDayInt(aStart);
  const a2 = parseDayInt(aEnd);
  const b1 = parseDayInt(bStart);
  const b2 = parseDayInt(bEnd);
  if (![a1, a2, b1, b2].every(Number.isFinite)) return false;
  return a1 < b2 && b1 < a2;
}

/**
 * Check if a requested `[startDate, endDate)` stay fits inside at least one owner availability window.
 * @param {string} startDate
 * @param {string} endDate
 * @param {Array<{ start: string, end: string }>} availability
 * @returns {boolean}
 */
export function isRangeInsideAvailability(startDate, endDate, availability) {
  const s = parseDayInt(startDate);
  const e = parseDayInt(endDate);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return false;
  if (!Array.isArray(availability) || availability.length === 0) return false;
  return availability.some((win) => {
    const ws = parseDayInt(win?.start);
    const we = parseDayInt(win?.end);
    return Number.isFinite(ws) && Number.isFinite(we) && s >= ws && e <= we;
  });
}

/**
 * Validate a requested booking date range against today and listing availability.
 * @param {string} startDate
 * @param {string} endDate
 * @param {Array<{ start: string, end: string }>} availability
 * @param {string} [todayStr]
 * @returns {{ ok: boolean, days: number, reason?: string }}
 */
export function validateStayRange(startDate, endDate, availability, todayStr = getTodayDateStr()) {
  const s = parseDayInt(startDate);
  const e = parseDayInt(endDate);
  const t = parseDayInt(todayStr);
  if (!Number.isFinite(s) || !Number.isFinite(e)) {
    return { ok: false, days: 0, reason: 'Select valid pickup and return dates.' };
  }
  if (s < t) {
    return { ok: false, days: 0, reason: 'Pickup date cannot be in the past.' };
  }
  if (e <= s) {
    return { ok: false, days: 0, reason: 'Return date must be after pickup date.' };
  }
  if (e - s > 90) {
    return { ok: false, days: 0, reason: 'Bookings cannot exceed 90 days.' };
  }
  if (!isRangeInsideAvailability(startDate, endDate, availability)) {
    return { ok: false, days: 0, reason: 'Selected dates are outside the owner’s available windows.' };
  }
  return { ok: true, days: e - s };
}
