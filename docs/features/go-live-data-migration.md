# Go-live data migration (people-eat → peopleeat)

## Behavior

One-shot freeze cutover copies production predecessor data into the new Coolify Postgres:

1. Stop writes on people-eat; keep `https://people-eat.com` image routes serving.
2. Dump MySQL.
3. Run `npm run db:migrate-from-people-eat` against empty (migrated) target Postgres.
4. Script inserts rows with the **same 20-char nanoIds**, HTTP-fetches media from `https://people-eat.com` into `FileUploads`, and archives
   orphan history into `MigrationArchive`.
5. Verify counts / sample PKs; switch DNS; decommission the old image store only after a soak period.

Users keep `legacyPasswordHash` (bcrypt) for a possible future password log-on; runtime auth stays email OTP / passkeys / TOTP. Pending
phone updates become `Users.phoneNumber` (unconfirmed). Pending email updates apply when the user has no confirmed email; otherwise they are
archived. Sessions get a synthetic `userAgent` plus imported `geoInformation` / `previousSessionId`. Cooks keep predecessor city/geo on
`legacyCityName` / `legacyLatitude` / `legacyLongitude` (`legacyCityName` falls back for public cook city; lat/lng stay storage-only).

Published legal (privacy / terms / imprint) is seeded from predecessor German page copy **before** Users, with `publishedAt` at or before
imported `lastAccepted*` so the acceptance gate does not force a mass re-accept. Mapped `WebPages` SEO upserts into product `WebPages`. Open
`TimeControlledTasks` become pg-boss jobs. `NewsletterSubscriptions` import into the product table. WhatsApp history binds `userId` when the
phone matches an imported user and marks media messages as `MEDIA`.

## Decisions

| Decision          | Choice                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cutover           | Maintenance freeze (no dual-write)                                                                                                                                                 |
| Entity ids        | Preserve predecessor nanoIds (`char(20)`); `idCreate()` for new rows                                                                                                               |
| Files             | HTTP GET from `https://people-eat.com` (not local `static-files/`)                                                                                                                 |
| Orphans           | `MigrationArchive` JSON (SMS/email ExternalMessages, unmapped WebPages, …). Booking-request AI chats and Logs stay dump-only. Predecessor cook `rank` is dropped.                  |
| Legal             | Markdown from predecessor DE pages (no page H1 — chrome owns the title; links normalized); publish before Users; backdated `publishedAt`                                           |
| WebPages          | Mapped keys upsert; unmapped keys archived                                                                                                                                         |
| Jobs              | Open TimeControlledTasks → pg-boss (`createQueue` then `send` with `startAfter` = dueDate)                                                                                         |
| Gift-card PDFs    | Not publicly served on predecessor; leave null and regenerate later                                                                                                                |
| Gift-card session | Predecessor `sessionId` null / unimported → terminated synthetic `Sessions` row (`idCreate()`), mapping in `GiftCards.syntheticSession`; bind `userId` when `buyerId` was imported |

## Next steps / Ideas

Cutover readiness gaps (toggles, Amex redirect, auth messaging, …) live in [go-live-cutover-gaps.md](./go-live-cutover-gaps.md).

- Wire `legacyPasswordHash` into email+password log-on if product wants it
- Best-effort workshop AdminAssistant → `Chats` / `ChatTurns` transform
- One-off Klaviyo list backfill for imported newsletter rows when `KLAVIYO_NEWSLETTER_LIST_ID` is set after cutover

## Implementation

### Schema

- Entity PK/FK columns: `nanoId()` helper in [`src/server/db/schema.ts`](../../src/server/db/schema.ts) (`varchar(20)`)
- `Users.legacyPasswordHash`, `Sessions.previousSessionId`, `Sessions.geoInformation`, `MigrationArchive`
- `NewsletterSubscriptions` — see [newsletter.md](./newsletter.md)
- `Cooks.legacyCityName` / `legacyLatitude` / `legacyLongitude` (import-preserved; city used as public display fallback)
- Baseline migration: `drizzle/0000_*.sql` (varchar(20) nanoIds + archive columns). Existing UUID-shaped DBs must be wiped and remigrated —
  do not ALTER uuid→varchar in place.
- Id helper: [`src/shared/idCreate.ts`](../../src/shared/idCreate.ts) (`idCreate`, `zNanoId`)

### ETL

Package: [`scripts/migrateFromPeopleEat/`](../../scripts/migrateFromPeopleEat/)

Notable modules:

| Module                          | Role                                          |
| ------------------------------- | --------------------------------------------- |
| `legalImport.ts` + `legal/*.md` | Published AdminLegal\* before Users           |
| `webPagesImport.ts`             | Mapped WebPages upsert                        |
| `timeControlledTasksImport.ts`  | Open tasks → pg-boss (`createQueue` + `send`) |
| `importDomains.ts`              | Core domains + WhatsApp + newsletter          |

Progress: each bulk phase logs `label current/total (pct%)` (~every 500 rows or 2s) and `done in Xs`. File fetches log attempted/ok/fail.
Sessions, CookieSettings, SessionEvents, BookingRequestParticipants, BookingRequestCooks, CityCooks / PartnerCooks, testimonial join tables,
and media-less BookingRequestOfferEvents use multi-row INSERTs (`MIGRATE_DB_BATCH_SIZE`, default 100) with `MIGRATE_DB_CONCURRENCY`
(default 8) parallel batches. Content pages (cities / partners / blog) **prefetch** deduped hero/section media with
`MIGRATE_HTTP_CONCURRENCY` (default 12), then insert rows with DB concurrency; profile pictures, meals, and testimonials use the same HTTP
pool. FileImporter coalesces concurrent fetches for the same URL / imageId. SessionEvents whose `type` is in the peopleeat taxonomy
(including legacy keys no longer emitted) import with `sessionEventPayloadFromLegacy` (booking-form Next/Send clicks → `step_completed`
funnel steps; other interactions `areaName` → `area`); unknown types archive as `SessionEvents.unmappable` with the same DB concurrency.
Offer events with media run in parallel workers (`max(DB, HTTP)` concurrency) with concurrent URL fetches per event. At the end the script
prints a **failure summary** (counts by source + sample ids/messages); exit code `3` if any skips/failures were recorded.

Sessions import notes:

- Does **not** write a `Sessions.extra` archive row per session (that doubled INSERTs and stalled/OOM’d large runs). Raw IP / `languageCode`
  remain in the MySQL dump.
- Orphan `Sessions.userId` values (no matching imported user) are nulled so the Users FK cannot abort mid-loop.
- `CookieSettings` maps predecessor `microsoftClarity` → `clarity`.
- `Logs` and booking-request AI chats (`BookingRequestChats` / `BookingRequestChatMessages`) are not imported into `MigrationArchive` (dump
  only).
- Cooks import `stageName` + `lastModifiedAt` onto product columns; predecessor `rank` is dropped (not archived). Stripe Connect comes from
  `payoutMethods` → `Cooks.stripeAccount*`.
- City slug renames go to `Cities.previousPathNames` only; `Cities.extra` is leftovers from unmapped sections.
- `FeatureToggles` are not imported — configure toggles in the new app (predecessor percentage / `goLive` model does not map 1:1).
- Gift cards with null or unimported `sessionId` get a terminated synthetic session (UA `peopleeat-import/… clientType=MIGRATION`) so the
  required FK is satisfied; redeem codes / balances still import. Mapping archived as `GiftCards.syntheticSession`.

```bash
# Required env (also loads .env.local)
export SOURCE_MYSQL_URL='mysql://…'
export DATABASE_URL='postgres://…'   # or TARGET_DATABASE_URL
export VISITOR_IP_HASH_SALT='…'      # same salt as production peopleeat
# optional
export SOURCE_WEB_ORIGIN='https://people-eat.com'
export MIGRATE_HTTP_CONCURRENCY=12
export MIGRATE_DB_CONCURRENCY=8
export MIGRATE_DB_BATCH_SIZE=100

npm run db:migrate-from-people-eat -- --dry-run
npm run db:migrate-from-people-eat
npm run db:migrate-from-people-eat -- --verify-only
```

### Freeze-day checklist

Ops beyond ETL (toggles, Amex, auth messaging): [go-live-cutover-gaps.md](./go-live-cutover-gaps.md).

1. Announce window; freeze predecessor **writes**; keep image HTTP up.
2. `mysqldump` production MySQL.
3. Snapshot Coolify Postgres; wipe app data if needed (`npm run db:wipe -- --confirm` on the target after snapshot).
4. Confirm drizzle migrations applied (including NewsletterSubscriptions + nanoId + archive columns).
5. Run ETL; review verify output and `MigrationArchive` volume.
6. Smoke: OTP log-on, cook Stripe Connect id, booking, gift-card redeem, sample `/api/file-uploads/…` images, legal pages, footer
   newsletter, WhatsApp inbound.
7. DNS / Coolify cutover; point Stripe / Resend / WhatsApp webhooks at the new app.
8. Keep MySQL dump ≥30 days; only then decommission Ionos media.

### Fidelity notes

See the migration plan inventory: raw session UA was never stored (synthetic only); raw IP becomes `ipHash` (+ optional archive); phone
confirmation state is not modeled; gift-card invoice PDFs are not on the public HTTP surface. Legal EN bodies from the predecessor are not
imported (peopleeat legal CMS is German-only).

**Content pages:**

- **Partners hero:** predecessor H1 was `name`, eyebrow was `headline` (often a kebab slug). Map `name` / `nameEnglish` → `headlineDe` /
  `headlineEn`; archive legacy eyebrow under `Partners.extra`. Map `firstSectionImageUrl` → `firstSectionImageFileUploadId`.
- **Cities hero / first section:** keep `headline` → `headlineDe` (already human titles). Map `firstSectionHeadline*` / `firstSectionBody*`
  into the fixed CTA slot columns. Predecessor Cities have no first-section image (column stays null). Hero and section media URLs are
  fetched via route + id on `SOURCE_WEB_ORIGIN` (with `?el=1024`), not the raw stored host URL.
- **Sections:** `legacyJsonArray` normalizes MySQL JSON that may arrive as a string/Buffer before mapping. Map `content` / `image` / `quote`
  / `list` / `cta` (plus legacy untyped blog rows), including `subtitle*` and `renderImageFirst` → `imageFirst`. Leftovers archive under
  `*.extra`.
- **pathName:** `importPathNameResolve` runs `pathNameSlugify`; originals that differ go to `previousPathNames`. Slug collisions suffix with
  `-{idPrefix}` (richer city keeps the canonical slug). `previousPathNames` also goes through `legacyJsonArray`.

**Other domains:**

- **Meals:** map `deletedAt`; non-deleted rows get `publishedAt = createdAt` (no predecessor draft flag).
- **Menus:** insert before offers, then patch `bookingRequestOfferId` / `copyOfMenuId`. Offer copies whose offer was not imported are
  soft-deleted (`Menus.offerNotImported`) so they do not pollute cook inventory.
- **EmailAddressUpdates:** apply pending email when `Users.emailAddress` is null; otherwise archive as `EmailAddressUpdates.pending`. Do not
  write pending emails into `previousEmailAddresses`.
- **SessionEvents:** `sessionEventPayloadFromLegacy` maps known booking-form Next/Send clicks to `step_completed` funnel steps; other
  interactions only rename `areaName` → `area`. No `step_entered` is synthesized.
- **SupportRequests:** `RESOLVED` rows stamp `resolvedAt` (predecessor value or `createdAt`).
