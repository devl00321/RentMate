/**
 * Pure booking pricing calculator in integer paise (Decision D-002, rules/02 s4).
 * FEE_RATE is a PLACEHOLDER (OQ-001) imported from constants.js.
 */
import { FEE_RATE } from '../config/constants.js';

/**
 * Half-up integer rounding for non-negative numbers.
 * @param {number} value
 * @returns {number}
 */
export function roundHalfUp(value) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value + 0.5 + Number.EPSILON);
}

/**
 * Compute booking amounts in integer paise.
 * @param {object} input
 * @param {number} input.dailyPaise
 * @param {number} input.depositPaise
 * @param {number} input.days
 * @param {number} [input.feeRate] - Defaults to FEE_RATE (PLACEHOLDER)
 * @returns {{ days: number, dailyPaise: number, rental: number, fee: number, deposit: number, renterPays: number, ownerGets: number }}
 */
export function calculateBookingPricing({ dailyPaise, depositPaise, days, feeRate = FEE_RATE }) {
  if (!Number.isInteger(dailyPaise) || dailyPaise < 0) {
    throw new RangeError('dailyPaise must be a non-negative integer');
  }
  if (!Number.isInteger(depositPaise) || depositPaise < 0) {
    throw new RangeError('depositPaise must be a non-negative integer');
  }
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError('days must be a positive integer');
  }

  const rental = dailyPaise * days;
  const fee = roundHalfUp(rental * feeRate);
  const deposit = depositPaise;
  const renterPays = rental + fee + deposit;
  const ownerGets = rental;

  return { days, dailyPaise, rental, fee, deposit, renterPays, ownerGets };
}
