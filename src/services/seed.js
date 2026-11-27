/**
 * Purpose: Seed 12 clearly labelled sample listings into Firestore in a single batch.
 * Collections touched: listings/{id}.
 * Quota note: 12 batch writes per seed invocation (only run once when populating dev DB).
 */
import { doc, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { initFirebase, trackWrite } from '../config/firebase.js';
import { SAMPLE_LISTINGS } from '../config/seedListings.js';
import { AppError, ERROR_CODES } from '../config/errors.js';

/**
 * Write the 12 sample listings to Firestore under the signed-in owner's UID.
 * @param {{ uid: string }} owner
 * @returns {Promise<number>} count written
 */
export async function seedSampleListings(owner) {
  if (!owner?.uid) {
    throw new AppError(ERROR_CODES.AUTH_REQUIRED, 'Sign in before seeding sample listings.');
  }
  const { db } = await initFirebase();
  const batch = writeBatch(db);
  for (const sample of SAMPLE_LISTINGS) {
    const { id, ...rest } = sample;
    batch.set(doc(db, 'listings', id), {
      ...rest,
      ownerId: owner.uid,
      ownerPhoto: '',
      isSample: true,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
  trackWrite(SAMPLE_LISTINGS.length, 'seed.sampleListings');
  return SAMPLE_LISTINGS.length;
}
