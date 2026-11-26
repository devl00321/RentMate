/**
 * Handover ribbon component (signature element 1, rules/06 s1).
 * Renders all 9 booking statuses (7 track stops + Cancelled/Disputed).
 */
import { BOOKING_STATUS, BOOKING_STATUS_ORDER, DEPOSIT_STATE } from '../config/constants.js';
import { html, raw } from './dom.js';

const HELD_STATUSES = new Set([
  BOOKING_STATUS.PAID,
  BOOKING_STATUS.HANDED_OVER,
  BOOKING_STATUS.RETURNED,
]);

/**
 * Render the booking lifecycle handover ribbon.
 * @param {object} opts
 * @param {string} opts.status - Current booking status (one of BOOKING_STATUS).
 * @param {string} [opts.depositState] - Current deposit state (DEPOSIT_STATE).
 * @param {'auto' | 'vertical'} [opts.orientation]
 * @param {string} [opts.lastActiveStatus] - Optional last linear status before Cancelled/Disputed.
 * @returns {ReturnType<typeof html>}
 */
export function ribbon({
  status,
  depositState = '',
  orientation = 'auto',
  lastActiveStatus = BOOKING_STATUS.REQUESTED,
}) {
  const isCancelled = status === BOOKING_STATUS.CANCELLED;
  const isDisputed = status === BOOKING_STATUS.DISPUTED;
  const isBranch = isCancelled || isDisputed;

  const activeIdx = isBranch
    ? BOOKING_STATUS_ORDER.indexOf(lastActiveStatus)
    : BOOKING_STATUS_ORDER.indexOf(status);

  const isHeld =
    depositState === DEPOSIT_STATE.HELD || (!isCancelled && HELD_STATUSES.has(status));

  const listClass = orientation === 'vertical' ? 'ribbon ribbon--vertical' : 'ribbon';

  const statusChip = isDisputed
    ? html`<span class="chip chip--danger">Disputed — under admin review</span>`
    : isCancelled
      ? html`<span class="chip chip--danger">Cancelled</span>`
      : html`<span class="chip${isHeld ? ' chip--held' : ''}">${status}</span>`;

  return html`
    <div class="ribbon-wrap" data-status="${status}">
      <div class="ribbon-wrap__status" style="margin-bottom:var(--s3)">${statusChip}</div>
      <ol class="${listClass}" aria-label="Booking progress: ${status}">
        ${BOOKING_STATUS_ORDER.map((step, idx) => {
          const isDone = !isBranch && idx < activeIdx;
          const isDoneBranch = isBranch && activeIdx >= 0 && idx <= activeIdx;
          const isCurrent = !isBranch && idx === activeIdx;
          const cls = isDone || isDoneBranch ? 'is-done' : isCurrent ? 'is-current' : '';
          const ariaCurr = isCurrent ? raw(' aria-current="step"') : '';
          return html`<li class="${cls}"${ariaCurr}>${step}</li>`;
        })}
      </ol>
      ${isHeld
        ? html`<div class="ribbon-hold"><span>Deposit held until the owner confirms return</span></div>`
        : ''}
    </div>
  `;
}
