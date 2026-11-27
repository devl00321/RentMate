# RentMate Two-Account + Admin Walkthrough (`demo-script.md`)

Run this script with two browser profiles (Profile A = Owner, Profile B = Renter) plus an Admin account promoted via `users/{uid}.role = "admin"` in Firestore Console (Decision D-010).

> **Note:** Payments and deposit release run in **test mode** (`Test mode: no real money moves`).

## 1. Account Setup (Objective 1)

1. **Profile A (Owner):** Open `#/auth`, choose **Create account**, enter name (`Asha`), city (`Bengaluru`), email, password -> **Create account**.
2. **Profile B (Renter):** In second browser/incognito window, open `#/auth`, register (`Ravi`, `Bengaluru`) or sign in with **Phone OTP** (6-cell input using a Firebase Console test number).
3. Verify both accounts see **Renting**, **Lending**, and **Listings** tabs in `#/dashboard` (one account acts as both).
4. Optional admin verification badge: in Firestore Console, set `users/{uid}.verified = true` on Asha and `users/{uid}.role = "admin"` on Admin.

## 2. Listing & Search (Objectives 2 & 3)

1. **Owner (Asha):** Open `#/list`, complete the 4 steps (Photo upload/URL, Details, Price `₹1,200` + Deposit `₹8,000`, Availability range `2026-12-01` to `2026-12-31`) -> **Publish listing**.
2. **Renter (Ravi):** Open `#/search`, filter by category `Cameras & Lenses`, city `Bengaluru`, max price `1500`, dates `2026-12-05` to `2026-12-08`. Confirm Asha's listing appears and **Load more** / Back navigation uses cached results (`[Quota]`).

## 3. Request, Negotiation & Double-Booking Lock (Objectives 4 & 5)

1. **Renter:** Open Asha's listing `#/listing/{id}`, pick `2026-12-05` to `2026-12-08` on the keyboard-accessible calendar, verify breakdown, click **Request dates** -> redirects to `#/booking/{id}` (`Requested`).
2. **Renter:** In `#/booking/{id}`, send a message and click **Send offer** (`₹1,100/day`, deposit `₹8,000`, pickup `10:00`) -> status becomes `Negotiating`.
3. **Owner:** Open the same booking from `#/dashboard` -> **Lending**, verify real-time chat bubble appears, click **Accept offer** -> status becomes `Accepted`, terms freeze, and `bookedDays` locks are created.
4. **Double-booking check:** Open a third window (or second request for `2026-12-06` to `2026-12-09`) on the same listing -> calendar blocks `5, 6, 7` and concurrent accept fails with conflict error.

## 4. Test-Mode Payment, Handover, Return & Review (Objectives 6 & 7)

1. **Renter:** Click **Pay and confirm** -> in Checkout modal select **Simulate failed payment** first -> **Pay and confirm** -> verify booking remains `Accepted` and retry button appears.
2. Switch radio to **Simulate successful payment** -> **Retry payment** -> status becomes `Paid`, ribbon shows **Deposit held**, and exact pickup coordinates can be shared in chat.
3. **Pickup (Handover):** Owner uploads pickup condition photo and clicks **Confirm pickup**; Renter clicks **Confirm pickup** -> status transitions `Paid` -> `Handed Over`.
4. **Return & Deposit Release:** Renter uploads return photo and clicks **Confirm return**; Owner clicks **Confirm return** (`Returned`) -> Owner clicks **Release deposit** -> status becomes `Completed`, deposit `released` (test mode), `bookedDays` locks freed.
5. **Two-way Reviews:** Both Asha and Ravi submit a 1-5 star review -> verify duplicate submit is impossible and public reputation updates on `#/profile/{uid}`.

## 5. Dispute & Admin Moderation (Objective 7)

1. Repeat steps 3-4 up to `Handed Over` on a second booking, click **Open dispute** with a required reason (`Disputed`).
2. **Admin:** Open `#/admin` (non-admins are redirected away), select the dispute, verify chat transcript, condition photos, and event log are visible, enter a required note, and choose **Release**, **Forfeit**, or **Cancel & refund**.
3. On a reported listing (`Report listing` modal), Admin pauses or removes the listing and confirms it disappears from `#/search`.
