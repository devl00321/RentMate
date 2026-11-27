# RentMate Architecture & Spark Quota Budget

## 1. Layer Architecture

RentMate uses a framework-free ES2022 single-page client (`<script type="module">`) backed by Firebase Auth, Cloud Firestore, Firestore Security Rules, and Cloudinary unsigned image uploads.

- **`src/domain/`**: Pure business rules (pricing, integer dates, booking transition table, search query planner, reputation math, report/dispute planners). Zero DOM, zero Firebase imports. Tested with `node --test`.
- **`src/services/`**: All Firebase Auth/Firestore, Cloudinary, and payment adapter calls. Returns plain objects and throws `AppError(code, message, cause)`.
- **`src/components/`**: Reusable UI pieces (`dom.js` XSS-safe HTML helper, `ribbon.js`, `calendar.js`, `chatPanel.js`, `handoverPanel.js`, `checkoutModal.js`).
- **`src/views/`**: Lazy-loaded screens (`import()` in `src/router.js`) wiring services to components and detaching listeners on route leave.

## 2. Spark Plan Quota Budget (20,000 writes/day, 50,000 reads/day)

Every `getDocs()` call in `src/services/` is bounded by `limit()`. Real-time `onSnapshot()` listeners are restricted to the open `bookings/{id}` document and the last `50` messages of that booking, and are detached on route change.

| User Flow | Reads | Writes | Notes |
|---|---|---|---|
| Sign up (Email) | 0 | 1 | Creates `users/{uid}` |
| Browse Search page (no dates) | 12 max | 0 | `limit(12)` + session cache on Back |
| Browse Search page (with dates) | 12 + 12 max | 0 | `limit(1)` `bookedDays` check per candidate |
| Open Listing Detail | 1 + bookedDays | 0 | Listing doc + up to 180 day lock IDs |
| Request Booking (`Requested`) | 1 conflict check | 2 | Batch: `booking` + `events` |
| Accept Offer / Request (`Accepted`) | 1-2 | 2 + N days | Batch: `booking` + `events` + `bookedDays` locks |
| Chat Message / Offer | 0 | 1 or 3 | Rate limited (1.5s gap, max 12/min) |
| Test-mode Checkout (`Paid`) | 0 | 3 | Batch: `booking` + `events` + `system` chat |
| Handover / Return / Complete | 0 | 2 + 2 + (3 + N) | Frees `bookedDays` locks on `Completed` |
| Profile + Reviews | 1 + 12 max | 0 | `limit(12)` recent reviews |

A dev quota tracker in `src/config/firebase.js` (`trackRead`, `trackWrite`, `getQuotaStats`) logs cumulative session reads/writes when `ENV.debugQuota` is `true`.

## 3. Test-Mode Payments & Upgrade Path

All money moves behind the swappable adapter in `src/services/payments.js` (`createSimulatedProvider` by default, `createRazorpayTestProvider` interface included). All UI breakdowns label **Test mode: no real money moves**.

**Upgrading from Spark to Production Escrow (Stretch S1):**
1. Upgrade Firebase to the Blaze plan and deploy Cloud Functions (`createRazorpayOrder`, `verifyRazorpayWebhook`, `releaseDeposit`).
2. Update `ENV.payments.provider = 'razorpay-test'` (or `'razorpay-live'`) and pass server-created `order_id` into `Razorpay(options)`.
3. Lock `bookings/{id}` `status: 'Paid'` and `depositState` transitions in `firestore.rules` so only Cloud Functions Admin SDK writes payment states.
