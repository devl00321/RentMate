# 06 UI/UX Design System: "Handover"

Source files: `design/tokens.css` (the tokens and core components) and
`design/design-preview.html` (open it in a browser; it is the visual reference).
Build every screen from these. Do not restyle from scratch.

## 1. Concept

RentMate is about a **handover between two people who have not met**. The look
should feel clear, trustworthy and a little playful, like a luggage tag on a
well-kept item. Two memorable elements carry the identity; everything else stays
quiet:

1. **The handover ribbon**: the booking lifecycle drawn as a track with seven
   stops, plus a teal band showing the deposit is held from Paid to Returned. It
   is real information (the report's status sequence), not decoration.
2. **The hang tag price**: each listing's daily price sits on a marigold tag
   with a punched hole.

Why this and not the usual: it avoids the cream-and-terracotta and dark-neon
defaults. The cool chalk page, ink text and cobalt actions say "reliable
infrastructure"; marigold and teal are used only for price and money-held.

## 2. Palette (tokens in `design/tokens.css`)

| Token | Light | Used for |
|---|---|---|
| `--chalk` | #EEF1F6 | page background |
| `--surface` | #FFFFFF | cards, inputs |
| `--ink` / `--ink-2` | #111631 / #4A5170 | text / secondary text |
| `--cobalt` | #2D4BE0 | primary action, current step, links |
| `--held` | #0B7A6B | deposit held, success, verified |
| `--marigold` | #F4B63E | price tag only (plus small highlights) |
| `--berry` | #C6305B | errors, destructive, disputes |

Rules: one primary button per view. Colour never carries meaning alone (add icon
or text). Dark theme is provided by tokens; test both. Contrast at least 4.5:1
for text, 3:1 for UI edges.

## 3. Typography

- Display: **Bricolage Grotesque** (headings, price, wordmark).
- Body and UI: **Instrument Sans**. Both from Google Fonts with `font-display:
  swap` and a system fallback stack. Self-host if the CSP requires it.
- Scale: 13, 15, 17, 21, 28, 40, 56 px (fluid for the top two). Body 16 to 17 px,
  line height 1.55. Headings line height 1.1 to 1.2, tight tracking (-0.01em).
- Sentence case everywhere. No all-caps labels, no eyebrow text above headings,
  no decorative tracking. Line length at most 70 characters.

## 4. Layout and shape

- 4 px spacing grid. Content max width 1180 px, side padding 16 / 24 / 40 px.
- Left-aligned text; centre alignment only for empty states and modals.
- Shape follows hierarchy: tags 6 px, controls 10 px, cards 18 px, avatars full.
  Do not use one radius for everything.
- Depth: tinted ink shadows (`--lift`), used on the one raised thing per area
  (the card being hovered, the booking panel). Borders in `--mist` for rest state.
- Photos lead. A listing card is 70% photo; text is name, place, rating, tag.

## 5. Screen specs

| Screen | Must have |
|---|---|
| Home | Headline, one search form (what, where, dates), the ribbon explainer, a grid of nearby listings, how deposits work in two plain sentences |
| Search | Filter bar (category, price, location, dates), result count, 12 cards per page, "Load more" (no infinite listener), sort |
| Listing detail | Photo gallery (keyboard accessible), hang tag price, deposit line, owner card (verified badge, rating), availability calendar, sticky "Request dates" panel with the price breakdown |
| Listing form | Stepwise (Photos, Details, Price and deposit, Dates), live preview of the card, inline validation |
| Booking | The ribbon at the top, price breakdown, chat with offer bubbles, one clear next action button per status, handover and return photo upload |
| Dashboard | Tabs: Renting, Lending, Listings. Each row shows status as ribbon chip |
| Profile | Name, city, verified badge, reputation (average, count, recent reviews) |
| Admin | Queue of reports and disputes, evidence view (chat, photos, events), decision form with required note |
| Auth | Email or phone, OTP entry with 6 separate cells, clear resend timing |

## 6. Components (build in `src/components/`, style in `components.css`)

Button (primary, ghost, danger), field (label, hint, error), chip, price tag,
listing card, owner badge, rating stars, ribbon, calendar, modal, toast, empty
state, skeleton, tabs, photo uploader. Each has: default, hover, focus-visible,
active, disabled, loading, error where relevant.

## 7. States (mandatory on every data view)

- **Loading:** skeletons shaped like the final content, not spinners alone.
- **Empty:** say what is missing and the next action ("No items match. Try
  fewer filters or list your own item").
- **Error:** what happened, what to do, a retry button. No apologies, no jargon.
- **Offline / quota exceeded:** specific message; keep the page usable.
- **Success:** confirm in the same words as the action ("Request sent").

## 8. Copy rules

1. Plain verbs: "Request dates", "Send offer", "Confirm pickup", "Release deposit".
2. The same action keeps the same name everywhere (button, toast, history).
3. Money is always shown with the rupee symbol and thousands separators in the
   Indian grouping; use `Intl.NumberFormat('en-IN')`.
4. Wherever money moves, show "Test mode: no real money moves" until the
   project is configured for live payments.
5. Never use placeholder lorem ipsum or fake reviews in shipped views. Seed data
   is clearly labelled as sample content in the seed script and docs.

## 9. Motion

- One orchestrated moment: on opening a booking the ribbon fills up to the
  current step (about 600 ms). Everything else is response to the user's action:
  button press, modal open, toast, new message.
- Durations 120 to 220 ms for controls, ease `--ease`. Honour
  `prefers-reduced-motion` (no animation, instant states).

## 10. Accessibility and responsiveness

- Mobile first. Breakpoints: 640, 960, 1180. The ribbon turns vertical below 640.
- Touch targets at least 44 px. Visible focus ring on everything focusable.
- Every image has alt text (listing photos use the title plus "photo n").
- Forms: labels, `aria-describedby` for hints and errors, error summary on submit.
- Dynamic updates (new message, toast) use `aria-live="polite"`.
- Test with keyboard only and at 200% zoom.

## 11. Self-critique checklist (run before closing any UI task)

- [ ] Could this screen belong to any other marketplace? If yes, strengthen the
      tag or ribbon usage, or fix the type and spacing.
- [ ] Is there exactly one primary action?
- [ ] Is every colour doing a job?
- [ ] Remove one decorative thing.
- [ ] Compare to `design/design-preview.html` at 360 and 1280 px.
