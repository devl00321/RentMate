/**
 * Keyboard-operable availability & booking date-range calendar component (M5.3).
 */
import { buildMonthGrid, classifyDayCell, rangeHasBookedDay } from '../domain/calendarMath.js';
import { countDays, formatDayInt, getTodayDateStr, isRangeInsideAvailability, parseDayInt } from '../domain/dates.js';
import { html, raw, renderHtml } from './dom.js';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Mount interactive calendar into container.
 * @param {Element} container
 * @param {object} opts
 * @param {Array<{ start: string, end: string }>} opts.availability
 * @param {string[]} [opts.bookedDays]
 * @param {string} [opts.startDate]
 * @param {string} [opts.endDate]
 * @param {(sel: { startDate: string, endDate: string, days: number }) => void} opts.onChange
 */
export function mountCalendar(container, opts) {
  const bookedSet = new Set(opts.bookedDays || []);
  const todayStr = getTodayDateStr();
  const initialDate = opts.startDate || opts.availability?.[0]?.start || todayStr;
  const [initY, initM] = initialDate.split('-').map(Number);

  let year = initY || new Date().getUTCFullYear();
  let monthIndex = (initM ? initM - 1 : new Date().getUTCMonth());
  let startDate = opts.startDate || '';
  let endDate = opts.endDate || '';
  let hint = '';

  function stepMonth(delta) {
    monthIndex += delta;
    if (monthIndex < 0) {
      monthIndex = 11;
      year -= 1;
    } else if (monthIndex > 11) {
      monthIndex = 0;
      year += 1;
    }
    paint();
  }

  function handleDayPick(dateStr) {
    hint = '';
    if (!startDate || (startDate && endDate) || dateStr <= startDate) {
      const nextDay = formatDayInt(parseDayInt(dateStr) + 1);
      if (bookedSet.has(dateStr) || !isRangeInsideAvailability(dateStr, nextDay, opts.availability)) {
        hint = 'Pick an available start date.';
        return paint();
      }
      startDate = dateStr;
      endDate = '';
      opts.onChange({ startDate, endDate: '', days: 0 });
      return paint(dateStr);
    }

    if (
      !isRangeInsideAvailability(startDate, dateStr, opts.availability) ||
      rangeHasBookedDay(startDate, dateStr, bookedSet)
    ) {
      startDate = dateStr;
      endDate = '';
      hint = 'Range crossed a booked or unavailable day — started a new range.';
      opts.onChange({ startDate, endDate: '', days: 0 });
      return paint(dateStr);
    }

    endDate = dateStr;
    opts.onChange({ startDate, endDate, days: countDays(startDate, endDate) });
    paint(dateStr);
  }

  function paint(focusDate = '') {
    const grid = buildMonthGrid(year, monthIndex);
    renderHtml(
      container,
      html`
        <div class="cal" role="region" aria-label="Availability calendar">
          <div class="cal__head">
            <button type="button" class="btn btn--ghost cal__nav" data-cal-prev aria-label="Previous month">Prev</button>
            <strong aria-live="polite">${grid.label}</strong>
            <button type="button" class="btn btn--ghost cal__nav" data-cal-next aria-label="Next month">Next</button>
          </div>
          <div class="cal__grid" role="grid" aria-label="${grid.label}">
            ${WEEKDAYS.map((w) => html`<span class="cal__dow" role="columnheader">${w}</span>`)}
            ${grid.cells.map((cell) => {
              if (!cell) return html`<span class="cal__empty"></span>`;
              const st = classifyDayCell({
                dateStr: cell.dateStr,
                todayStr,
                availability: opts.availability,
                bookedSet,
                startDate,
                endDate,
              });
              const cls = [
                'cal__day',
                st.isBooked ? 'is-booked' : '',
                st.isStart ? 'is-start' : '',
                st.isEnd ? 'is-end' : '',
                st.isInRange ? 'is-in-range' : '',
              ].filter(Boolean).join(' ');
              const stateText = st.isBooked ? 'booked' : st.isStart ? 'selected pickup' : st.isEnd ? 'selected return' : st.disabled ? 'unavailable' : 'available';
              const disAttr = st.disabled ? raw(' disabled') : '';
              const pressed = st.isStart || st.isEnd || st.isInRange ? 'true' : 'false';
              return html`
                <button
                  type="button"
                  class="${cls}"
                  data-cal-day="${cell.dateStr}"
                  aria-label="${cell.dateStr}, ${stateText}"
                  aria-pressed="${pressed}"${disAttr}
                >${cell.dayNum}</button>
              `;
            })}
          </div>
          <div class="cal__foot muted">
            <span>${startDate ? (endDate ? `${startDate} → ${endDate} (${countDays(startDate, endDate)} days)` : `Pickup: ${startDate} — pick return`) : 'Pick pickup and return dates'}</span>
            ${startDate ? html`<button type="button" class="btn btn--ghost cal__clear" data-cal-clear>Clear</button>` : ''}
          </div>
          ${hint ? html`<p class="field__error" role="status">${hint}</p>` : ''}
        </div>
      `,
    );

    container.querySelector('[data-cal-prev]')?.addEventListener('click', () => stepMonth(-1));
    container.querySelector('[data-cal-next]')?.addEventListener('click', () => stepMonth(1));
    container.querySelector('[data-cal-clear]')?.addEventListener('click', () => {
      startDate = '';
      endDate = '';
      hint = '';
      opts.onChange({ startDate: '', endDate: '', days: 0 });
      paint();
    });

    const buttons = Array.from(container.querySelectorAll('[data-cal-day]'));
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => handleDayPick(btn.getAttribute('data-cal-day') || ''));
      btn.addEventListener('keydown', (e) => {
        const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        const delta = offsets[/** @type {KeyboardEvent} */ (e).key];
        if (!delta) return;
        e.preventDefault();
        const curr = btn.getAttribute('data-cal-day') || '';
        const targetStr = formatDayInt(parseDayInt(curr) + delta);
        const nextBtn = /** @type {HTMLButtonElement | null} */ (container.querySelector(`[data-cal-day="${targetStr}"]`));
        nextBtn?.focus();
      });
    });

    if (focusDate) {
      /** @type {HTMLButtonElement | null} */ (container.querySelector(`[data-cal-day="${focusDate}"]`))?.focus();
    }
  }

  paint();
}
