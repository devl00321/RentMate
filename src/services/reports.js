/**
 * Purpose: Listing reports, booking disputes, evidence loading, and admin resolution.
 * Collections touched: reports/{id}, bookings/{id}, listings/{id}, listings/{id}/bookedDays/{day}.
 * Quota note: limit(12) open reports queue; bounded chat(50) + events(50) for dispute evidence.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { CHAT_MESSAGE_LIMIT, PAGE_SIZE } from '../config/constants.js';
import { AppError, ERROR_CODES } from '../config/errors.js';
import { initFirebase, trackRead, trackWrite } from '../config/firebase.js';
import {
  buildBookingDispute,
  buildListingReport,
  planAdminDisputeDecision,
  planListingModeration,
} from '../domain/reportsOps.js';
import { listBookingEvents, mapBookingError } from './bookingQueries.js';
import { getPaymentProvider } from './payments.js';

/**
 * Submit a report against a listing.
 * @param {{ listing: any, reporterUid: string, reason: string }} input
 */
export async function submitListingReport(input) {
  const built = buildListingReport(input);
  if (!built.ok) throw new AppError(ERROR_CODES.VALIDATION_INVALID, built.reason || 'Invalid report.');
  try {
    const { db } = await initFirebase();
    const ref = doc(collection(db, 'reports'));
    const batch = writeBatch(db);
    batch.set(ref, { ...built.data, createdAt: serverTimestamp() });
    await batch.commit();
    trackWrite(1, 'reports.submitListing');
    return { id: ref.id, ...built.data };
  } catch (err) {
    throw mapBookingError(err, 'Could not submit listing report.');
  }
}

/**
 * Open a booking dispute (`Paid`/`Handed Over`/`Returned` -> `Disputed`) and create a report.
 * @param {{ booking: any, reporterUid: string, reason: string }} input
 */
export async function openBookingDispute(input) {
  const built = buildBookingDispute(input);
  if (!built.ok) throw new AppError(ERROR_CODES.VALIDATION_INVALID, built.reason || 'Cannot open dispute.');
  try {
    const { db } = await initFirebase();
    const reportRef = doc(collection(db, 'reports'));
    const batch = writeBatch(db);
    batch.update(doc(db, 'bookings', input.booking.id), {
      ...built.bookingPatch,
      updatedAt: serverTimestamp(),
    });
    batch.set(reportRef, { ...built.report, createdAt: serverTimestamp() });
    batch.set(doc(collection(db, 'bookings', input.booking.id, 'events')), {
      ...built.event,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'bookings', input.booking.id, 'messages')), {
      ...built.systemMessage,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    trackWrite(4, 'reports.openDispute');
    return { id: reportRef.id, ...built.report };
  } catch (err) {
    throw mapBookingError(err, 'Could not open dispute.');
  }
}

/**
 * Fetch up to `limit(12)` open reports for admin queue.
 */
export async function listOpenReports({ maxCount = PAGE_SIZE } = {}) {
  try {
    const { db } = await initFirebase();
    const q = query(
      collection(db, 'reports'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc'),
      limit(maxCount),
    );
    const snap = await getDocs(q);
    trackRead(Math.max(1, snap.size), 'reports.listOpen');
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    throw mapBookingError(err, 'Could not load admin report queue.');
  }
}

/**
 * Load full evidence for a dispute report: booking doc (with photos), chat (50), and events (50).
 * @param {any} report
 */
export async function getDisputeEvidence(report) {
  try {
    const { db } = await initFirebase();
    const bSnap = await getDoc(doc(db, 'bookings', report.bookingId));
    trackRead(1, 'reports.evidenceBooking');
    if (!bSnap.exists()) return { booking: null, messages: [], events: [] };

    const msgQ = query(
      collection(db, 'bookings', report.bookingId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(CHAT_MESSAGE_LIMIT),
    );
    const [msgSnap, events] = await Promise.all([
      getDocs(msgQ),
      listBookingEvents(report.bookingId),
    ]);
    trackRead(Math.max(1, msgSnap.size), 'reports.evidenceMessages');

    return {
      booking: { id: bSnap.id, ...bSnap.data() },
      messages: msgSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      events,
    };
  } catch (err) {
    throw mapBookingError(err, 'Could not load dispute evidence.');
  }
}

/**
 * Admin resolves a disputed booking (release, forfeit, or cancel) with a required note.
 * @param {{ report: any, booking: any, adminUid: string, isAdmin: boolean, action: 'release' | 'forfeit' | 'cancel', note: string }} input
 */
export async function resolveBookingDispute(input) {
  const planned = planAdminDisputeDecision(input);
  if (!planned.ok) throw new AppError(ERROR_CODES.VALIDATION_INVALID, planned.reason || 'Invalid decision.');

  if (planned.needsDepositRefund) {
    const provider = await getPaymentProvider();
    await provider.releaseDeposit({
      paymentId: input.booking.paymentRef || input.booking.id,
      amountPaise: input.booking.amounts?.deposit || 0,
    });
  }

  try {
    const { db } = await initFirebase();
    const batch = writeBatch(db);
    batch.update(doc(db, 'bookings', input.booking.id), {
      ...planned.bookingPatch,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'reports', input.report.id), {
      ...planned.reportPatch,
      resolvedAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'bookings', input.booking.id, 'events')), {
      ...planned.event,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'bookings', input.booking.id, 'messages')), {
      ...planned.systemMessage,
      createdAt: serverTimestamp(),
    });
    for (const day of planned.unlockDays) {
      batch.delete(doc(db, 'listings', input.booking.listingId, 'bookedDays', day));
    }
    await batch.commit();
    trackWrite(4 + planned.unlockDays.length, 'reports.resolveDispute');
  } catch (err) {
    throw mapBookingError(err, 'Could not save admin decision.');
  }
}

/**
 * Admin moderates a reported listing (pause, remove, or dismiss report).
 * @param {{ reportId: string, listingId: string, adminUid: string, isAdmin: boolean, action: string, note: string }} input
 */
export async function moderateReportedListing(input) {
  const planned = planListingModeration(input);
  if (!planned.ok) throw new AppError(ERROR_CODES.VALIDATION_INVALID, planned.reason || 'Invalid action.');

  try {
    const { db } = await initFirebase();
    const batch = writeBatch(db);
    if (planned.listingStatus) {
      batch.update(doc(db, 'listings', input.listingId), { status: planned.listingStatus });
    }
    batch.update(doc(db, 'reports', input.reportId), {
      status: 'resolved',
      decision: { action: input.action, note: planned.note, resolvedBy: input.adminUid },
      resolvedAt: serverTimestamp(),
    });
    await batch.commit();
    trackWrite(planned.listingStatus ? 2 : 1, 'reports.moderateListing');
  } catch (err) {
    throw mapBookingError(err, 'Could not moderate listing.');
  }
}
