# RentMate

Peer-to-peer rental marketplace for everyday belongings built with plain HTML, CSS, and ES2022 modules (no UI framework), Firebase Authentication, Cloud Firestore, Firestore Security Rules, Cloudinary unsigned image uploads, and test-mode payments.

> **Test mode notice:** Payments and security deposit release run in **test mode** (`Test mode: no real money moves`). Real escrow requires server code on Firebase's paid Blaze plan.

## Quick Start with Docker (1 command)

Start the entire local stack (web app + Firebase Auth & Firestore Emulators + auto-seeded 12 sample listings & 3 demo accounts):

```bash
./tools/rentmate.sh start   # or: docker compose up -d --build
```

- **App:** `http://localhost:8080/`
- **Firebase Emulator UI:** `http://localhost:4000/`
- **Demo logins (password `rentmate123`):** `owner@rentmate.test`, `renter@rentmate.test`, `admin@rentmate.test`

Stop everything in one command:

```bash
./tools/rentmate.sh stop    # or: docker compose down
```

Run tests inside Docker: `./tools/rentmate.sh test` (or `docker compose run --rm test`).

## Setup (7 steps from a fresh clone for live Firebase)

1. **Clone and copy local config:**
   `cp src/config/env.example.js src/config/config.local.js`
2. **Add Firebase Web config:** Create a Firebase project (Spark free plan), enable **Authentication** (Email/Password + Phone test numbers) and **Cloud Firestore**, and paste your Web App config into `src/config/config.local.js`.
3. **Deploy rules and indexes:** Run `firebase deploy --only firestore:rules,firestore:indexes` (or set `useEmulator: true` in `config.local.js` for local Auth/Firestore emulators).
4. **Add Cloudinary preset:** Create an unsigned upload preset in Cloudinary Console and set `cloudinary.cloudName` and `cloudinary.uploadPreset` in `src/config/config.local.js`.
5. **Start local server:** Run `python3 -m http.server 8080` from the repository root and open `http://localhost:8080/`.
6. **Optional sample catalog:** Preview 12 clearly labelled sample listings immediately at `http://localhost:8080/#/search?sample=1`, or sign in and run `seedSampleListings(user)` from `src/services/seed.js`.
7. **Run checks:** Execute `node --test tests/domain/*.test.js tests/rules/*.test.js`, `./tools/check-lines.sh`, and `./tools/check-secrets.sh`.

## Secrets & API Key Hygiene

- **Git-ignored files:** `src/config/config.local.js`, `.env*`, `.firebaserc`, `*serviceAccount*.json`, `*.pem`, `*.key`, and debug logs are excluded in `.gitignore`.
- **Client-only config:** Only public client identifiers belong in `config.local.js` (Firebase Web config, Cloudinary `cloudName` + unsigned `uploadPreset`, Razorpay test `key_id`, HTTP-referrer-restricted Maps key). Never place server secrets (`key_secret`, `api_secret`, admin SDK JSON) in client code.
- **Hosting deploy:** `firebase.json` excludes docs/tests/rules while allowing your local `config.local.js` to bundle into Firebase Hosting when you run `firebase deploy`.

## Documentation

- Architecture, quota budget, and Blaze upgrade path: [docs/architecture.md](docs/architecture.md)
- End-user guide (Renter, Owner, Admin): [docs/user-guide.md](docs/user-guide.md)
- Two-account + Admin walkthrough script: [docs/demo-script.md](docs/demo-script.md)

## Open Questions & Placeholders (`brain.md`)

Items left unspecified by the Review-1 Report are labelled `PLACEHOLDER` in code:

- `OQ-001` / `OQ-002`: Service fee `FEE_RATE = 0.05` (5%), charged to renter on top.
- `OQ-003`: Cancellation policy (free before Paid; full test-mode refund after Paid and before Handed Over; Dispute after Handed Over).
- `OQ-004` / `OQ-005`: Reviews immutable after submit; `verified` badge set by admin/Console only.
- `OQ-006` / `OQ-007` / `OQ-010`: 8 starter categories (`src/config/constants.js`), no deposit cap, `Asia/Kolkata` timezone with inclusive start / exclusive end dates.
- `OQ-008` / `OQ-009`: Report team member names 2-6 and reference publication years 5-8.
