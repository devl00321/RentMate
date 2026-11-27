# RentMate User Guide

RentMate lets neighbors rent everyday belongings (cameras, drones, tools, instruments, camping and party gear) using a single account for both renting and lending.

> **Important:** Payments and deposit release run in **test mode** (`Test mode: no real money moves`).

## For Renters

1. **Sign up:** Go to **Sign in** (`#/auth`) and create an account with email/password or Phone OTP.
2. **Search & filter:** Open **Browse** (`#/search`), filter by keyword, category, city, daily price range, and pickup/return dates.
3. **Check calendar & request dates:** On a listing (`#/listing/:id`), select available green/white dates on the calendar (booked dates are crossed out), check the rental + 5% (`PLACEHOLDER`) service fee + deposit breakdown, and click **Request dates**.
4. **Negotiate:** Use the in-booking chat (`#/booking/:id`) to ask questions or send a **Counter-offer** (daily rate, deposit, pickup time). Once accepted, terms lock and dates are reserved.
5. **Pay (test mode):** Click **Pay and confirm**. You can simulate either success or failure/retry in test mode. Your exact pickup address is shared once Paid.
6. **Pickup, return & review:** Confirm pickup and return with condition photos. After completion, leave a 1-5 star rating.

## For Owners

1. **List an item:** Open **List an item** (`#/list`) and follow the 4 steps (Photos, Details, Price & deposit, Available dates) with live card preview.
2. **Manage listings:** In **Dashboard -> Listings** (`#/dashboard`), edit, pause, or remove any listing.
3. **Accept & release deposit:** Respond to incoming requests under **Dashboard -> Lending**, confirm pickup with a condition photo, confirm return, and click **Release deposit** when the item is back in good order.

## For Admins

1. Admins are promoted manually in Firestore Console (`users/{uid}.role = "admin"`).
2. Open **Admin** (`#/admin`) to review reported listings (Pause / Remove / Dismiss) and booking disputes (inspecting chat transcript, condition photos, and event log before releasing or forfeiting the deposit with a required note).
