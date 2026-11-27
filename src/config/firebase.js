/**
 * Firebase initialization (pinned SDK 13.4.0) and dev quota counter (rules/01 s4).
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { ENV as EXAMPLE_ENV } from './env.example.js';
import { AppError, ERROR_CODES } from './errors.js';

let cachedEnv = null;
let cachedApp = null;
let cachedAuth = null;
let cachedDb = null;

const quotaState = { reads: 0, writes: 0 };

/**
 * Load config.local.js if present, otherwise fall back to env.example.js.
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

/**
 * Check whether Firebase config has non-placeholder keys or emulator mode enabled.
 * @param {typeof EXAMPLE_ENV} env
 * @returns {boolean}
 */
export function isFirebaseConfigured(env) {
  if (!env?.firebase?.apiKey) return false;
  if (env.useEmulator) return true;
  return !String(env.firebase.apiKey).startsWith('PLACEHOLDER_');
}

/**
 * Initialize Firebase app, Auth, and Firestore once.
 * @returns {Promise<{ app: any, auth: any, db: any, env: typeof EXAMPLE_ENV }>}
 */
export async function initFirebase() {
  const env = await loadEnv();
  if (!isFirebaseConfigured(env)) {
    throw new AppError(
      ERROR_CODES.CONFIG_MISSING,
      'Firebase config is still using placeholders. Add src/config/config.local.js.',
    );
  }

  if (!cachedApp) {
    cachedApp = initializeApp(env.firebase);
    cachedAuth = getAuth(cachedApp);
    cachedDb = getFirestore(cachedApp);

    if (env.useEmulator) {
      const host = env.emulatorHost || '127.0.0.1';
      connectAuthEmulator(cachedAuth, `http://${host}:${env.emulatorAuthPort || 9099}`, {
        disableWarnings: true,
      });
      connectFirestoreEmulator(cachedDb, host, env.emulatorFirestorePort || 8081);
    }
  }

  return { app: cachedApp, auth: cachedAuth, db: cachedDb, env };
}

/**
 * Record estimated Firestore reads for Spark quota awareness (dev-only log).
 * @param {number} count
 * @param {string} label
 */
export function trackRead(count, label) {
  quotaState.reads += count;
  if (cachedEnv?.debugQuota) {
    console.info(`[Quota] +${count} read(s) (${label}) | session: ${quotaState.reads}R / ${quotaState.writes}W`);
  }
}

/**
 * Record estimated Firestore writes for Spark quota awareness (dev-only log).
 * @param {number} count
 * @param {string} label
 */
export function trackWrite(count, label) {
  quotaState.writes += count;
  if (cachedEnv?.debugQuota) {
    console.info(`[Quota] +${count} write(s) (${label}) | session: ${quotaState.reads}R / ${quotaState.writes}W`);
  }
}

/**
 * Return current session read/write totals.
 * @returns {{ reads: number, writes: number }}
 */
export function getQuotaStats() {
  return { ...quotaState };
}
