# 00 Core Rules (read first, every session)

## 1. Priority order when rules conflict

1. The RentMate Review-1 Report facts (section 2 below)
2. These rules, then the other `rules/` files
3. `brain.md` decisions
4. Your own preferences (lowest)

## 2. Ground truth from the report (quote, do not embellish)

- **Title:** RentMate: A Peer-to-Peer Rental Marketplace for Renting Everyday
  Belongings with Verified Users, Negotiation and Secure Payments.
- **Users:** owners, renters (one account can do both), administrators.
- **Registration:** email or phone OTP; profile with name, city, photo;
  verified users get a badge.
- **Listing:** photos, category, description, daily price, refundable security
  deposit, available dates.
- **Search:** filter by category, price, location and dates; calendar blocks
  dates already booked (no double booking).
- **Negotiation:** in-app chat plus counter-offers on price, deposit or pickup time
  until one side accepts.
- **Payment:** after acceptance the renter pays rental fee + deposit through the
  platform; platform keeps its service fee and holds the deposit.
- **Handover and return:** both confirm pickup and return in the app, with a photo
  of the item's condition; deposit released after the owner confirms return.
- **Reviews:** two-way ratings update a public reputation score on each profile.
- **Disputes:** either side can report; admin reviews chat, photos, booking record
  and decides on the deposit. Admin also reviews reported listings.
- **Revenue:** a small service fee on each completed rental.
- **Statuses:** Requested, Negotiating, Accepted, Paid, Handed Over, Returned,
  Completed, or Cancelled and Disputed.
- **Free-plan limits cited:** Firebase Spark = 20,000 Firestore writes and
  50,000 reads per day, product shut off for the period once quota runs out
  (report ref 9). Report ref 10 (a community guide) claims Cloud Storage for
  Firebase is not on Spark since 2 Feb 2026, so photos go to an external host and
  are compressed before upload. Secure deposit release needs Cloud Functions on
  the paid Blaze plan, so this project simulates release in test mode.
- **Currency:** rupees (the report's example uses a camera worth 80,000 rupees).

## 3. Not in the report (never state as fact)

Service fee percentage, deposit limits, cancellation refund rules, review window,
exact schema, admin creation method, listing categories, search radius, and the
names of team members 2 to 6. Handle each as a Decision or Open question in
`brain.md`. Defaults you pick are labelled `PLACEHOLDER` in code and docs.

## 4. Anti-hallucination protocol

1. Before using any external API, open the official documentation and confirm the
   function name, signature and current version. Record the verified version in
   `brain.md`.
2. If you cannot verify something, write it as an Open question; do not code around
   a guess silently.
3. Never invent library functions, config keys, Firestore rule syntax or CLI flags.
   Run the command or test to prove it works.
4. Never claim a test passed without running it. Paste the real result in the
   report line `PROOF`.
5. Never claim a UI works without opening it in a browser (headless is fine) and
   checking the console is clean.
6. Never fabricate citations, statistics or user quotes in the UI or docs.
7. When memory and the repo disagree, the repo wins.

## 5. File discipline

- **Hard cap: 250 lines per file**, any type. Target 120 to 200.
- One responsibility per file. If you need "and" to describe it, split it.
- Split early: at 200 lines, plan the split; do not wait for 250.
- Generated lockfiles and vendored binaries are exempt (and there should be few).
- Run `tools/check-lines.sh` before every commit.

## 6. Memory files you must maintain

| File | Purpose | Update when |
|---|---|---|
| `goal.md` | Milestones, tasks, status | A task starts, finishes or is blocked |
| `brain.md` | Current focus, obstacles, plans, past decisions | Every task, every failure, every choice |

Rules for `brain.md`: append-only for the Decision log (never rewrite history;
supersede with a new entry that references the old id). Keep it under 250 lines by
moving old closed items into `brain-archive.md`. Never delete an obstacle: mark it
`RESOLVED` with the fix.

## 7. Git discipline

- One commit per finished task, message `M3.2: listing form validation`.
- Never commit secrets, `node_modules`, or the real `config.local.js`.
- Branch per milestone is optional; commits must always leave the app runnable.

## 8. Communication style

Short, factual, specific. No filler. State what you ran and what you saw.
