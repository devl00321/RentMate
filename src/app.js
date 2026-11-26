/**
 * RentMate application entry point.
 */
import { FEE_RATE, BOOKING_STATUS } from './config/constants.js';
import { AppError, ERROR_CODES } from './config/errors.js';

/**
 * Boot the application shell.
 */
function boot() {
  const root = document.getElementById('app');
  if (!root) {
    throw new AppError(ERROR_CODES.CONFIG_MISSING, 'Missing #app mount element.');
  }
  root.textContent = `RentMate ready (${Object.keys(BOOKING_STATUS).length} statuses, fee rate ${FEE_RATE * 100}% PLACEHOLDER).`;
}

boot();
