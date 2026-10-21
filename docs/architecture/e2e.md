# End-to-end tests (Playwright)

## Context

Booking and admin flows are multi-party: a customer action must be visible (or invisible) to cooks in/out of travel radius, other offer
cooks, and admins. Vitest command/query tests already cover authorization matrices against a real database. They do not prove that the
matching UI surfaces show the right rows under real session cookies.

## Decision

Use **`@playwright/test`** (devDependency) for a thin layer of multi-party UI journeys. Keep the production **`playwright`** package for
server-side browser capture only — see [browser-capture.md](./browser-capture.md). Do not import `playwright` from app code; do not share
`serverRuntime.browser` with e2e.

### Actor model

Each party is an **actor**: seeded `users` (+ `cooks` / `admins`) + bound `sessions` row + an isolated Playwright `BrowserContext` with that
session id injected as the HttpOnly session cookie (`sessionCookieName`). One test owns one **world** (shared booking request / offers) and
N actors.

Typical shape:

1. Arrange — seed via `e2e/fixtures/db.ts` (nanoId isolation, same as Vitest — no truncate). Sessions also get a mandatory `CookieSettings`
   row so the consent banner does not mask dialogs. Seeded users set `locale: 'en'` so `/en/…` journeys do not open `LocaleMismatchGate`.
   Seeded emails lower-case the nanoId (`e2e-customer-{userId.toLowerCase()}@…`) so OTP verify’s `emailNormalize` still matches. Content
   publish specs use lower-case path tokens — `contentPathNameNormalize` / `pathNameSlugify` lowercases slugs on save. Root gates are
   exclusive (`locale → legal → cookie`); seeding still clears locale and cookie so later surfaces are not blocked by an earlier one — see
   [session-startup-gates.md](../features/session-startup-gates.md).
2. Act — one actor drives a UI mutation (or seed the mutation when the form path is out of scope)
3. Assert — other actors navigate their list/detail pages and assert presence/absence by a unique token in the copy

**Never drive GraphQL from the test.** E2e must not call `/api/graphql`, use URQL, or assert on operation payloads. Arrange through the DB
fixture; act and assert through the browser as a user would (clicks, fills, navigation, visible copy). Side effects that have no UI (e.g.
`OutboundEmails` rows) may be polled from the DB after a UI action — that is not a substitute for asserting what another actor sees.

Auth for almost all e2e specs is **cookie injection**. Booking-request **create** journeys also exercise email OTP through the real auth
gate: the UI requests a code, the test reads the plaintext from `OutboundEmails` (`AUTH_EMAIL_OTP` subject includes the 6-digit code), and
types it into the OTP dialog. Command-level OTP hashing / verify edge cases stay in Vitest.

### Pyramid

| Layer                                       | Tool              | Owns                                                   |
| ------------------------------------------- | ----------------- | ------------------------------------------------------ |
| Commands / queries / authz / radius filters | Vitest + Postgres | Exhaustive who-can-see / who-can-write                 |
| Critical UI journeys across 2–4 parties     | Playwright        | Session cookie + real pages show / hide the right rows |

### Layout

```txt
playwright.config.ts
e2e/
  env.ts
  fixtures/db.ts                 # seed users, cooks, menus, admins, booking requests/offers; OTP + email helpers
  fixtures/actors.ts             # BrowserContext + session cookie (signed-in or anonymous)
  fixtures/ui.ts                 # clickUntil — retry clicks across the SSR→hydrate window
  fixtures/bookingRequestForm.ts # draft URL prefills (skip Places / most wizard steps)
  fixtures/authUi.ts             # request OTP in UI + enter code from OutboundEmails
  booking-request-pool.spec.ts
  booking-request-admin-approval.spec.ts
  booking-offer-create.spec.ts
  booking-offer-accept.spec.ts
  booking-request-create-signed-in.spec.ts      # cookie customer → Send request
  booking-request-create-returning-otp.spec.ts  # existing email → OTP → auto-submit
  booking-request-create-new-customer.spec.ts   # OTP → profile → create → auto-submit
  content-blog-post-publish.spec.ts             # admin create → draft hidden → publish visible
  content-partner-publish.spec.ts
  content-occasion-publish.spec.ts
  content-city-publish.spec.ts                  # city create stubs Places suggestions (no API key in CI)
  fixtures/contentPageUi.ts                     # SEO/hero fill, save, publish, public assert helpers
  fixtures/placesUi.ts                          # GraphQL stub for AdminCitiesPageLocationSuggestions
  *.spec.ts
```

Scripts: `npm run test:e2e`, `npm run test:e2e:ui`. Not folded into `npm test`.

**SSR vs click timing:** Buttons are painted before React attaches handlers. Humans rarely outrun hydration; Playwright often does. Use
`clickUntil(locator, assertion)` from `e2e/fixtures/ui.ts` for interactive controls (retry click until the dialog/toast appears) instead of
a single raw `locator.click()`. For one-shot create CTAs that insert on every click, use `clickUntilUrl` so retries do not mint duplicates
while waiting for navigate. Content editor **Save** is the same class of action: each click upserts and stacks Sonner “Saved” toasts —
`contentPageSave` stops re-clicking once a toast exists and asserts via `[data-sonner-toast]` (not bare `getByText('Saved')`, which also
matches ancestors and fails Playwright strict mode when toasts stack).

**Admin publication journey** (`booking-request-admin-approval.spec.ts`): seed a `PUBLICATION_BLOCKED_BY_ADMIN_REVIEW` large-group request
with two in-radius cooks. Assert neither cook sees the pool row; admin opens the approve dialog, deselects one cook, confirms; assert
`OutboundEmails` purpose `BOOKING_REQUEST_COOK_NOTIFY` for the selected cook only and matching pool visibility; then admin clicks “Suggest
to this cook too” on the offers tab, confirms the notify AlertDialog, and the second cook appears in the pool.

**Offer create** (`booking-offer-create.spec.ts`): seed a published request + Stripe-ready cook + a complete inventory menu (course title +
meal option — offer pickers reject incomplete menus). Cook opens the pool detail, selects the menu, continues through price and optional
personal-note steps (`?step=` URL-backed; use `clickUntilUrl` so Continue retries do not skip a step), then submits via the UI; assert the
non-dismissible **Offer sent successfully!** dialog, then the offer in the cook inbox and on the customer request detail. Also assert the
request left the open pool and the stale pool deep-link shows “You already created an offer” (no street / occasion PII).

**Offer accept** (`booking-offer-accept.spec.ts`): seed a cook-accepted offer (event ≥15 days out so accept uses SetupIntent) plus a second
in-radius cook with no offer. Customer accepts via the offer UI; assert checkout / payment status for the customer and “Confirmed” for the
chosen cook. Assert the other cook loses the pool row and gets a Taken deep-link (“Another chef was chosen”) with no request PII / winning
cook name. Skips when `STRIPE_SECRET_KEY` is unset (CI without a Stripe test secret).

**Pool visibility + cancel** (`booking-request-pool.spec.ts`): in-radius vs out-of-radius list/deep-link (out-of-radius deep-link = generic
Page not found). After customer cancel (churn → confirm), in-radius deep-link explains “Request withdrawn” without cancel-reason text;
out-of-radius stays generic not-found (no cancel oracle).

**Booking-request create + auth** (three specs): deep-link a complete form draft via URL search (`bookingRequestFormDraftUrl`) so Places is
never exercised. Signed-in customers click **Send request**; cold sessions click **Next** into `AuthIdentityGate`. Returning users verify
OTP for a seeded email (auto-submit on bind); new users complete profile + legal after OTP, then create account (auto-submit). Assert toast

- occasion on `/profile/booking-requests`. Named failures map to signed-in vs returning-OTP vs new-customer.

**Content page publish** (blog / partner / occasion / city): admin actor creates via list CTA (city create dialog needs a city-center pick —
`placesUi.cityCenterSuggestionsMock` stubs only that GraphQL operation; CI has no Places key). Editor sets a unique path/title/headline and
saves as draft. Anonymous actor asserts public list omits the title and detail is **Page not found**. Admin confirms **Publish**; anonymous
sees the list title and detail headline. Shared steps live in `contentPageUi.ts`.

Env: load `.env.test`, then `.env.local` with `override: true` so `sessionCookieName` matches `npm run dev` (Vite reads `.env.local`; dotenv
does not override keys set by an earlier file unless asked). Keep `DATABASE_URL` aligned between those files for local runs. CI sets env
vars explicitly and starts the app via Playwright `webServer` — see [infrastructure.md](../infrastructure.md#gate-jobs).

## Alternatives considered

- **Cypress** — weaker multi-origin / multi-context story; another browser stack beside capture Chromium.
- **API-only multi-party checks** — already covered by Vitest; miss UI/session bugs.
- **Full OTP login for every booking/offer e2e** — slow and brittle; cookie injection stays the default outside create-auth journeys.

## Consequences

- Multi-party scenarios stay readable (named actors + unique occasion tokens).
- CI needs Chromium install + a running app + Postgres (separate job from Vitest).
- Capture and e2e must stay documented as distinct Playwright uses so agents do not conflate them.
