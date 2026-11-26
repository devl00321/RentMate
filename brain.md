# brain.md: RentMate working memory

Rules: update on every task. Decision log is append-only (supersede, never edit).
Obstacles are never deleted, only marked RESOLVED with the cause. Move closed
items to `brain-archive.md` when this file nears 250 lines.

## 1. Current state

- Phase: M1 Design system and shell
- Last completed task: M1.1
- Next task: M1.2
- Uncommitted work: none
- Verified tool versions: Firebase JS SDK 13.4.0 (CDN ES modules); Node v26.5.0; Python 3.14.0
- Verified tool versions: Firebase JS SDK 13.4.0 (CDN ES modules); Node v26.5.0; Python 3.14.0

## 2. Now (current focus; rewrite per task)

- Task: M1.6 `dom.js` safe html helper with escaping test
- Plan:
  1. Create `src/components/dom.js` with `escapeHtml`, `html` tagged template, `raw`, `renderHtml`, `formatPaise`.
  2. Write `tests/domain/dom.test.js` testing XSS injection escaping, nested templates, arrays, and `renderHtml` guard.
  3. Run `node --test` and `tools/check-lines.sh`.
- Files being edited: `src/components/dom.js`, `tests/domain/dom.test.js`, `brain.md`, `goal.md`
- Done when: `node --test` passes injection tests and `tools/check-lines.sh` passes

## 3. Obstacles (open and resolved)

Format: `OB-n | status | symptom | attempts | cause or next idea`

- OB-1 | OPEN (watch) | Firebase Spark quota (20,000 writes and 50,000 reads a day per the report; shutdown when exhausted) | not an error yet | mitigated by rules/01 s4; measure in M10.3
- OB-2 | OPEN (watch) | Secure deposit release needs server-side checks (Cloud Functions, paid Blaze plan, per the report) | n/a | simulate in test mode (D-012); stretch S1
- OB-3 | RESOLVED | Report ref 10 (community guide) says Cloud Storage for Firebase is not on Spark since 2 Feb 2026 | verified 2026-11-27 | Firebase pricing docs show Spark tier free Cloud Storage has regional restrictions (US regions) and some bucket configs require Blaze; photos use external image host regardless (rules/01 s5)

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

## 6. Verified facts log (fill while building; link the doc page)

| Date | Fact verified | Source link | Used in |
|---|---|---|---|
| 2026-11-27 | Firebase JS SDK 13.4.0 modular ES modules at `https://www.gstatic.com/firebasejs/13.4.0/firebase-{app,auth,firestore}.js` (HTTP 200 verified) | https://firebase.google.com/docs/web/setup | M0.3, `src/config/firebase.js` |

## 7. Needs human (only when truly blocked)

- None yet. Expected asks: Firebase project config, Razorpay test keys,
  image-host cloud name and unsigned preset, Google Maps key, an admin email.

## 8. Lessons learned (short, reusable)

- (empty)
