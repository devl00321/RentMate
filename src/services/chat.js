/**
 * Purpose: Real-time booking chat (last 50) and counter-offer negotiation service.
 * Collections touched: bookings/{id}/messages/{id}, bookings/{id}, bookings/{id}/events/{id}, listings/{id}/bookedDays/{day}.
 * Quota note: single listener limit(50) detached on leave; client rate limiter prevents spam.
 */
import {
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { BOOKING_STATUS, CHAT_MESSAGE_LIMIT } from '../config/constants.js';
import { AppError, ERROR_CODES } from '../config/errors.js';
import { initFirebase, trackRead, trackWrite } from '../config/firebase.js';
import { resolveBookingActor } from '../domain/bookingOps.js';
import {
  createMessageRateLimiter,
  planAcceptOffer,
  validateChatText,
  validateOffer,
} from '../domain/chatOps.js';
import { mapBookingError } from './bookingQueries.js';

const rateLimiter = createMessageRateLimiter();

/**
 * Subscribe to the latest 50 chat messages for a booking. Detach on route leave!
 * @param {string} bookingId
 * @param {(messages: any[]) => void} onMessages
 * @param {(err: AppError) => void} [onError]
 * @returns {Promise<() => void>}
 */
export async function watchChatMessages(bookingId, onMessages, onError) {
  const { db } = await initFirebase();
  const q = query(
    collection(db, 'bookings', bookingId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(CHAT_MESSAGE_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => {
      trackRead(Math.max(1, snap.size), 'chat.watchMessages');
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
      onMessages(items);
    },
    (err) => onError?.(mapBookingError(err, 'Could not sync chat messages.')),
  );
}

/**
 * Send a text chat message; moves Requested -> Negotiating if needed.
 * @param {{ booking: any, senderUid: string, text: string }} input
 */
export async function sendTextMessage({ booking, senderUid, text }) {
  const valid = validateChatText(text);
  if (!valid.ok) throw new AppError(ERROR_CODES.VALIDATION_INVALID, valid.reason || 'Invalid message.');

  const rate = rateLimiter.checkAndRecord(senderUid);
  if (!rate.ok) throw new AppError(ERROR_CODES.RATE_LIMITED, rate.reason || 'Rate limit exceeded.');

  try {
    const { db } = await initFirebase();
    const batch = writeBatch(db);
    const msgRef = doc(collection(db, 'bookings', booking.id, 'messages'));
    batch.set(msgRef, {
      senderId: senderUid,
      type: 'text',
      text: valid.text,
      createdAt: serverTimestamp(),
    });

    let writes = 1;
    if (booking.status === BOOKING_STATUS.REQUESTED) {
      batch.update(doc(db, 'bookings', booking.id), {
        status: BOOKING_STATUS.NEGOTIATING,
        lastActiveStatus: BOOKING_STATUS.NEGOTIATING,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, 'bookings', booking.id, 'events')), {
        actorId: senderUid,
        from: BOOKING_STATUS.REQUESTED,
        to: BOOKING_STATUS.NEGOTIATING,
        note: 'Started negotiation chat',
        createdAt: serverTimestamp(),
      });
      writes = 3;
    }

    await batch.commit();
    trackWrite(writes, 'chat.sendText');
  } catch (err) {
    throw mapBookingError(err, 'Could not send message.');
  }
}

/**
 * Send a counter-offer message (allowed only while Requested or Negotiating).
 * @param {{ booking: any, senderUid: string, offer: { dailyPaise: number, depositPaise: number, pickupTime: string } }} input
 */
export async function sendOfferMessage({ booking, senderUid, offer }) {
  if (
    booking.status !== BOOKING_STATUS.REQUESTED &&
    booking.status !== BOOKING_STATUS.NEGOTIATING
  ) {
    throw new AppError(ERROR_CODES.ILLEGAL_TRANSITION, 'Terms are frozen once accepted.');
  }

  const actor = resolveBookingActor(booking, senderUid);
  if (actor !== 'owner' && actor !== 'renter') {
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, 'Only booking parties can send offers.');
  }

  const valid = validateOffer(offer);
  if (!valid.ok) throw new AppError(ERROR_CODES.VALIDATION_INVALID, valid.reason || 'Invalid offer.');

  const rate = rateLimiter.checkAndRecord(senderUid);
  if (!rate.ok) throw new AppError(ERROR_CODES.RATE_LIMITED, rate.reason || 'Rate limit exceeded.');

  const summary = `Counter-offer: ₹${Math.round(offer.dailyPaise / 100)}/day, deposit ₹${Math.round(offer.depositPaise / 100)}, pickup ${offer.pickupTime}`;

  try {
    const { db } = await initFirebase();
    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'bookings', booking.id, 'messages')), {
      senderId: senderUid,
      type: 'offer',
      text: summary,
      offer: {
        dailyPaise: offer.dailyPaise,
        depositPaise: offer.depositPaise,
        pickupTime: String(offer.pickupTime).trim(),
      },
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'bookings', booking.id), {
      status: BOOKING_STATUS.NEGOTIATING,
      lastActiveStatus: BOOKING_STATUS.NEGOTIATING,
      latestOfferBy: actor,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'bookings', booking.id, 'events')), {
      actorId: senderUid,
      from: booking.status,
      to: BOOKING_STATUS.NEGOTIATING,
      note: summary,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    trackWrite(3, 'chat.sendOffer');
  } catch (err) {
    throw mapBookingError(err, 'Could not send counter-offer.');
  }
}

/**
 * Accept an offer message, freeze terms/amounts, and lock `bookedDays` atomically.
 * @param {{ booking: any, offer: any, offerSenderRole: 'owner' | 'renter', actorUid: string }} input
 */
export async function acceptOfferInChat({ booking, offer, offerSenderRole, actorUid }) {
  const actor = resolveBookingActor(booking, actorUid);
  if (actor !== 'owner' && actor !== 'renter') {
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, 'Only booking parties can accept offers.');
  }

  try {
    const { db } = await initFirebase();
    const conflictSnap = await getDocs(
      query(
        collection(db, 'listings', booking.listingId, 'bookedDays'),
        where(documentId(), '>=', booking.startDate),
        where(documentId(), '<', booking.endDate),
        limit(1),
      ),
    );
    trackRead(1, 'chat.acceptOfferConflictCheck');

    const planned = planAcceptOffer({
      booking,
      offer,
      offerSenderRole,
      actor,
      actorUid,
      datesFree: conflictSnap.empty,
    });
    if (!planned.ok) {
      throw new AppError(ERROR_CODES.CONFLICT_DATES, planned.reason || 'Cannot accept offer.');
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'bookings', booking.id), {
      ...planned.bookingPatch,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'bookings', booking.id, 'messages')), {
      ...planned.systemMessage,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'bookings', booking.id, 'events')), {
      ...planned.event,
      createdAt: serverTimestamp(),
    });
    for (const day of planned.lockDays) {
      batch.set(doc(db, 'listings', booking.listingId, 'bookedDays', day), {
        bookingId: booking.id,
        ownerId: booking.ownerId,
        renterId: booking.renterId,
      });
    }
    await batch.commit();
    trackWrite(3 + planned.lockDays.length, 'chat.acceptOfferBatch');
  } catch (err) {
    throw mapBookingError(err, 'Could not accept offer; dates may already be booked.');
  }
}
