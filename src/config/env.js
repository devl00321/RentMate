/**
 * Environment loader: imports git-ignored config.local.js if present, else env.example.js.
 */
import { ENV as EXAMPLE_ENV } from './env.example.js';

let cachedEnv = null;

/**
 * Load active environment configuration once.
 * @returns {Promise<typeof EXAMPLE_ENV>}
 */
export async function loadEnv() {
  if (cachedEnv) return cachedEnv;
  try {
    const localMod = await import('./config.local.js');
    cachedEnv = localMod.ENV || EXAMPLE_ENV;
  } catch {
    cachedEnv = EXAMPLE_ENV;
  }
  return cachedEnv;
}
