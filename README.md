# RentMate

Peer-to-peer rental marketplace for everyday belongings (HTML + CSS + JS, Firebase Auth & Firestore, external image host, test-mode payments).

> **Note:** Payments and security deposit release run in **test mode** (simulated).

## Local Development

Run any static HTTP server from the repository root (ES modules require HTTP, not `file://`):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/` in your browser.

### Tests and Checks

```bash
./tools/check-lines.sh
```

## Status

In development (Milestone M0: Foundation). See `goal.md` and `brain.md`.
