# brain.md: RentMate working memory

Rules: update on every task. Decision log is append-only (supersede, never edit).
Obstacles are never deleted, only marked RESOLVED with the cause. Move closed
items to `brain-archive.md` when this file nears 250 lines.

## 1. Current state

- Phase: M9 Disputes and admin
- Last completed task: M8.6
- Next task: M9.1
- Uncommitted work: none
- Verified tool versions: Firebase JS SDK 13.4.0 (CDN ES modules); Firebase CLI 15.32.1; OpenJDK 21.0.10; Node v26.5.0; Python 3.14.0

## 2. Now (current focus; rewrite per task)

- Task: M9.1-M9.5 Disputes and admin moderation
- Plan:
  1. Create `src/domain/reportsOps.js` pure validators & decision planners: `buildListingReport`, `buildBookingDispute`, `planDisputeResolution` (admin release deposit -> `Completed`, forfeit deposit -> `Completed`, or cancel+refund -> `Cancelled`, with required note + unlocking `bookedDays`).
  2. Create `src/services/reports.js` (`submitListingReport`, `openBookingDispute`, `listOpenReports` with `limit(12)`, `getDisputeEvidence`, `resolveBookingDispute`, `moderateReportedListing` to pause/remove listing).
  3. Update `firestore.rules` for `reports/{id}` (signed-in create, reporter/admin read, admin-only resolve update) and allow admin decision updates (`Completed`/`Cancelled`) + `forfeited` depositState on `bookings/{id}`.
  4. Wire "Report listing" modal in `src/views/listingDetail.js`, "Open dispute" modal in `src/views/booking.js`, and build `src/views/admin.js` (guarded by `requireAdmin` + `#/admin` route in `src/app.js` + nav link for admins).
  5. Write unit & rules tests in `tests/domain/reports.test.js`.
- Files being edited: `src/domain/reportsOps.js`, `src/services/reports.js`, `src/views/admin.js`, `src/views/listingDetail.js`, `src/views/booking.js`, `src/app.js`, `src/components/shell.js`, `firestore.rules`, `firestore.indexes.json`, `tests/domain/reports.test.js`, `brain.md`, `goal.md`
- Done when: report/dispute modals work, non-admins blocked from admin queue/rules, evidence + decisions + listing moderation tested, and all checks pass

## 3. Obstacles (open and resolved)

Format: `OB-n | status | symptom | attempts | cause or next idea`

- OB-1 | OPEN (watch) | Firebase Spark quota (20,000 writes and 50,000 reads a day per the report; shutdown when exhausted) | not an error yet | mitigated by rules/01 s4; measure in M10.3
- OB-2 | OPEN (watch) | Secure deposit release needs server-side checks (Cloud Functions, paid Blaze plan, per the report) | n/a | simulate in test mode (D-012); stretch S1
- OB-3 | RESOLVED | Report ref 10 (community guide) says Cloud Storage for Firebase is not on Spark since 2 Feb 2026 | verified 2026-11-27 | Firebase pricing docs show Spark tier free Cloud Storage has regional restrictions (US regions) and some bucket configs require Blaze; photos use external image host regardless (rules/01 s5)
- OB-4 | OPEN (env) | `firebase emulators:exec --only firestore` stalled at 1% downloading `cloud-firestore-emulator-v1.22.0.jar` (137MB) | 1 attempt | Auth emulator runs locally (`--only auth`); test rules/Firestore against staging Firebase project when human supplies keys, or retry jar download later (per rules/01 s6)

## 4. Open questions (report is silent; answer or keep PLACEHOLDER)

| Id | Question | Placeholder in use | Blocks |
|---|---|---|---|
| OQ-001 | Service fee percentage ("small service fee") | `FEE_RATE = 0.05` PLACEHOLDER | M7 |
| OQ-002 | Is the fee charged to renter, owner, or split? | charged to renter on top | M7 |
| OQ-003 | Cancellation and refund rules | rules/02 s6 minimal default | M5, M7 |
| OQ-004 | Review edit window | none after submit | M8 |
| OQ-005 | Who sets `verified` and when (admin check, OTP success, both) | admin-set only | M2 |
| OQ-006 | Item categories list | 8 starter categories chosen in M3 and logged | M3 |
| OQ-007 | Max deposit relative to price | none | M3 |
| OQ-008 | Names of team members 2 to 6 (blank in the report) | not used in code | docs |
| OQ-009 | Publication years for report refs 5 to 8 (report says to add them) | not used in code | docs |
| OQ-010 | Time zone and day counting convention | Asia/Kolkata, inclusive start, exclusive end | M5 |

## 5. Decision log (append-only)

Format: `D-n | date | decision | reason | alternatives | status`

- D-001 | kit | Client stack is HTML, CSS, JS with no framework; Firebase Auth, Firestore, Rules, Hosting; external image host; gateway test mode | fixed by the report | none | FINAL
- D-002 | kit | Money stored as integer paise, shown as rupees | avoids float errors; gateways use smallest unit | floats | ACTIVE
- D-003 | kit | Single-page app with hash router and ES modules, no bundler | keeps "no framework" and zero build step; works on Firebase Hosting | multi-page HTML | ACTIVE
- D-004 | kit | Booking transition table as in rules/02 s2 | report lists statuses only; table makes them enforceable | looser flow | ACTIVE (proposed)
- D-005 | kit | Cancellation default per rules/02 s6 | report is silent; minimal safe default | none | PLACEHOLDER
- D-006 | kit | Double-booking prevention with `bookedDays` lock docs per day, created in a batch | rules cannot range-query; locks make conflicts impossible | transactions only | ACTIVE (proposed)
- D-007 | kit | Day count inclusive start, exclusive end, integer dates | avoids off-by-one and float bugs | inclusive both | PLACEHOLDER
- D-008 | kit | Domain logic as pure functions in `src/domain/` tested with `node --test` | no test framework needed; fast | Jest | ACTIVE
- D-009 | kit | Firestore schema as rules/03 s1 | report names collections, not fields | other shapes | ACTIVE (proposed)
- D-010 | kit | Admins promoted by hand in the console; rules read `users/{uid}.role` | custom claims need server code (Blaze) | custom claims | ACTIVE
- D-011 | kit | Exact address revealed only after Paid | privacy for owners and renters | reveal at accept | ACTIVE (proposed)
- D-012 | kit | Deposit hold and release simulated behind `payments.js` adapter | matches the report's test-mode plan; clean upgrade path | none | ACTIVE
- D-013 | kit | Visual identity "Handover": chalk, ink, cobalt; ribbon and hang tag as signature elements; Bricolage Grotesque with Instrument Sans | distinct, trust-oriented, avoids generic defaults | see rules/06 s1 | ACTIVE
- D-014 | 2026-11-27 | 8 starter categories in `constants.js`: Cameras & Lenses, Drones & Action Cams, Power Tools, Musical Instruments, Camping & Outdoor, Party & Events, Sports & Fitness, Audio & Projectors | covers report examples + everyday gear (OQ-006) | fewer/more | PLACEHOLDER
- D-015 | 2026-11-27 | Compute public reputation (`ratingAvg`, `ratingCount`) on read from `reviews` (`limit(12)`) rather than relaxing `users/{uid}` rules | keeps client unable to tamper with `ratingAvg`/`ratingCount` without Cloud Functions on Spark | Cloud Functions trigger (Blaze) | ACTIVE

## 6. Verified facts log (fill while building; link the doc page)

| Date | Fact verified | Source link | Used in |
|---|---|---|---|
| 2026-11-27 | Firebase JS SDK 13.4.0 modular ES modules at `https://www.gstatic.com/firebasejs/13.4.0/firebase-{app,auth,firestore}.js` (HTTP 200 verified) | https://firebase.google.com/docs/web/setup | M0.3, `src/config/firebase.js` |
| 2026-11-27 | Firebase Auth 13.4.0 exports verified: `getAuth`, `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `sendPasswordResetEmail`, `signOut`, `onAuthStateChanged`, `RecaptchaVerifier(auth, containerId, opts)` (auth-first arg), `signInWithPhoneNumber`; test phone numbers configured in Console bypass real SMS/Blaze limits | https://firebase.google.com/docs/auth/web/password-auth & https://firebase.google.com/docs/auth/web/phone-auth | M2.1, `src/services/auth.js` |
| 2026-11-27 | Firestore 13.4.0 exports verified: `getFirestore`, `doc`, `collection`, `getDoc`, `getDocs`, `setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `query`, `where`, `orderBy`, `limit`, `startAfter`, `onSnapshot`, `serverTimestamp`, `documentId` | https://firebase.google.com/docs/firestore/quickstart | M2.1, `src/services/*.js` |
| 2026-11-27 | Cloudinary unsigned upload API verified: `POST https://api.cloudinary.com/v1_1/<cloudName>/image/upload` with `FormData` (`file`, `upload_preset`), returning `{ secure_url }` | https://cloudinary.com/documentation/upload_images#unsigned_upload | M3.1, `src/services/images.js` |
| 2026-11-27 | Razorpay Standard Checkout test mode verified: `https://checkout.razorpay.com/v1/checkout.js`, `new Razorpay({ key: 'rzp_test_...', amount, currency: 'INR', order_id, handler })`, `rzp.on('payment.failed', ...)` — requires server `order_id` & signature check for capture, matching D-012 simulated Spark adapter | https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/ | M7.1, `src/services/payments.js` |

## 7. Needs human (only when truly blocked)

- None yet. Expected asks: Firebase project config, Razorpay test keys,
  image-host cloud name and unsigned preset, Google Maps key, an admin email.

## 8. Lessons learned (short, reusable)

- Keep `https://` Firebase CDN imports isolated in `config/firebase.js` and `services/` that need Firebase; keep `config/env.js` and `domain/` free of `https://` imports so `node --test` runs cleanly without network ESM hooks.
