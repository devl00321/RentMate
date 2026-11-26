# 04 Coding Standards

## 1. Language and tooling

- Plain JavaScript (ES2022 modules), HTML5, CSS3. **No UI framework** (report).
- Firebase modular SDK, loaded as ES modules. Pin the exact version you verified
  and record it in `brain.md`.
- Optional dev tooling (Prettier, ESLint) is allowed only as devDependencies; the
  shipped client has no build step.
- Use JSDoc type comments on every exported function (no TypeScript required).

## 2. Naming

| Thing | Style | Example |
|---|---|---|
| Files | camelCase for JS, kebab-case for CSS/docs | `bookingMachine.js`, `listing-card.css` |
| Functions | verb first | `createBooking`, `canTransition` |
| Booleans | `is/has/can` prefix | `isAvailable` |
| Constants | UPPER_SNAKE | `FEE_RATE` |
| CSS classes | `block__element--modifier` (BEM) | `card__price--muted` |
| Firestore fields | camelCase | `depositPaise` |
| Money fields | suffix `Paise` | `dailyPaise` |

## 3. File and function size

- File cap 250 lines (hard). Function target 40 lines, hard limit 60.
- Max 4 parameters; otherwise pass an options object.
- No file exports more than about 8 things; split otherwise.

## 4. Error handling

1. Services throw `AppError(code, message, cause)` (define once in
   `src/config/errors.js`). Codes are constants, not free text.
2. Views catch errors and show a plain message with a next step (see
   `rules/06` copy rules). Never `alert()`; never swallow errors silently.
3. Log technical details to the console in dev; never log secrets or tokens.
4. Every async UI action disables its button and shows progress, then re-enables.

## 5. Security in code

- Never build HTML with string concatenation of user data. Use `textContent`,
  `createElement`, or a tiny `html` tagged template that escapes by default
  (write it once in `src/components/dom.js`).
- Validate every user input (type, length, range) in one place per form.
- No `eval`, no inline event handlers, no `innerHTML` with user data.
- Add a Content Security Policy meta or hosting header that allows only the
  verified origins (Firebase, image host, payment gateway, Maps). Verify each
  origin from official docs before listing it.

## 6. Accessibility baseline (shared with `rules/06`)

Semantic elements first (`button`, `a`, `nav`, `main`, `form`, `label`).
Every input has a visible label. Focus is visible. All actions work by keyboard.

## 7. Performance baseline

- Lazy-load below-the-fold images (`loading="lazy"`), set width and height.
- Import a view's module only when its route opens (dynamic `import()`).
- No layout thrash in lists; render with `DocumentFragment`.
- Budget: first view interactive on a mid-range phone on 4G in about 3 seconds;
  measure and record in `docs/architecture.md`.

## 8. Comments and docs

- Comment *why*, not *what*. No commented-out code. No TODOs without a task id
  (`TODO(M6.3): ...`).
- Each service file starts with a 3-line header: purpose, collections touched,
  quota note.

## 9. Commit hygiene

Small commits, one task each, message `<task id>: <imperative summary>`.
Run tests and `tools/check-lines.sh` before committing.

## 10. Dependencies

Prefer zero. Any dependency must be justified in `brain.md` (what, why, size,
license, alternatives considered). Never add a dependency to avoid writing 20 lines.
