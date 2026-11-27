/**
 * Environment configuration template.
 * Copy this file to `src/config/config.local.js` (git-ignored) and fill in
 * your project keys. Never commit `config.local.js`.
 */

export const ENV = {
  /** Firebase Web App config (Firebase Console -> Project Settings) */
  firebase: {
    apiKey: 'PLACEHOLDER_FIREBASE_API_KEY',
    authDomain: 'PLACEHOLDER_PROJECT_ID.firebaseapp.com',
    projectId: 'PLACEHOLDER_PROJECT_ID',
    storageBucket: 'PLACEHOLDER_PROJECT_ID.firebasestorage.app',
    messagingSenderId: 'PLACEHOLDER_SENDER_ID',
    appId: 'PLACEHOLDER_APP_ID',
  },

  /** External image host (Cloudinary unsigned upload preset) */
  cloudinary: {
    cloudName: 'PLACEHOLDER_CLOUD_NAME',
    uploadPreset: 'PLACEHOLDER_UNSIGNED_PRESET',
  },

  /** Payment gateway in test mode only */
  payments: {
    provider: 'simulated', // 'simulated' | 'razorpay-test'
    razorpayKeyId: 'PLACEHOLDER_RAZORPAY_TEST_KEY_ID',
  },

  /** Google Maps JavaScript / Places API key */
  maps: {
    apiKey: 'PLACEHOLDER_GOOGLE_MAPS_API_KEY',
  },

  /** Local Firebase Emulator Suite toggle */
  useEmulator: false,
  emulatorHost: '127.0.0.1',
  emulatorAuthPort: 9099,
  emulatorFirestorePort: 8081,

  /** Set true to log Firestore read/write quota counts in console */
  debugQuota: true,
};
