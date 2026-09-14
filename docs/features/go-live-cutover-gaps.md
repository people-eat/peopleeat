# Go-live cutover gaps (people-eat → peopleeat)

Last pre-cutover inventory of what still needs ops attention after the freeze ETL. Data pipeline details stay in
[go-live-data-migration.md](./go-live-data-migration.md). Predecessor root: `/Users/I517754/GitHub/people-eat`.

## Behavior

ETL now covers legal publish, WebPages SEO upsert, TimeControlledTasks → pg-boss, NewsletterSubscriptions import, and WhatsApp `userId` /
`MEDIA` fidelity. Same-day cutover still needs the MUST-DO ops below before DNS.

### MUST-DO before DNS

| Gap                         | Why it matters                                                                                                                  | Action                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Auth messaging**          | Runtime is email OTP / passkeys / TOTP only. `legacyPasswordHash` imports but is unused.                                        | Freeze-day notice: log in with email code. Smoke OTP + Resend delivery before DNS.                                                                                                                                       |
| **Integrations / webhooks** | Credentials and webhook URLs are env, not MySQL.                                                                                | Coolify: Stripe, Resend, WhatsApp (Meta), Slack secrets; point webhooks at the new app. Same `VISITOR_IP_HASH_SALT` as ETL. Set `KLAVIYO_NEWSLETTER_LIST_ID` if footer subscribe should hit Klaviyo.                     |
| **Feature toggles off**     | Predecessor toggles are skipped. Missing rows = off.                                                                            | Enable at least: `BOOKING_REQUEST_RESTRICTIONS` (if used), `PUBLICATION_MEALS`, `PUBLICATION_MENUS`. Leave `ASSISTANT_CUSTOMER` off.                                                                                     |
| **Media + money smoke**     | File fetch can fail; Stripe Connect / in-flight payments are continuity-critical.                                               | Verify sample `/api/file-uploads/…`, cook Connect ids, open booking payment states, gift-card redeem, legal pages, WhatsApp inbound. Review `MigrationArchive` and ETL failure summary (exit `3`).                       |
| **Booking event times**     | Older ETL builds used mysql2 `timezone: 'local'`; a non-UTC host shifted imported `dateTime` by the local offset (~2h in CEST). | Confirm ETL log line `MySQL DATETIME: interpreted as UTC`. Spot-check a few booking request times against MySQL / predecessor UI before DNS. Wipe + re-import if a bad run already landed.                               |
| **`/amex` missing**         | Predecessor Amex landing has **no** new route → 404.                                                                            | Traefik/nginx **301 `/amex` → `/`** (or a UTM landing) same day.                                                                                                                                                         |
| **WhatsApp templates**      | Code uses predecessor Meta names; some purposes are `null` until a template exists (cancel, payment, pull, customer accept).    | Confirm DE templates in WhatsApp Manager match `whatsappTemplateNameByPurpose`. Keep `WHATSAPP_ENGLISH_TEMPLATES` off until EN is approved. Smoke a booking create + cook notify on demo with `WHATSAPP_TRANSPORT=meta`. |

### SHOULD-DO soon after (hours–days)

| Gap                       | Impact                                                                                             | Suggested follow-up                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Cook logos**            | Import forces `logoFileUploadId = NULL`.                                                           | Mild About visual gap; cooks/admins can re-upload.                       |
| **Occasions CMS**         | New-only; empty until admins create/publish.                                                       | Fill when marketing needs it.                                            |
| **Klaviyo list backfill** | Imported newsletter rows are local; list subscribe only on new footer submits when list id is set. | One-off script to subscribe imported emails after list id is configured. |
| **Gift-card PDFs**        | Imported invoice/voucher file ids left null.                                                       | Regenerate on demand later.                                              |
| **Menu extras**           | `preparationTime` / `greetingFromKitchen` dump-only.                                               | Accept loss or recover from MySQL dump if needed.                        |

### OK to defer

| Item                                        | Why                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| Password log-on from `legacyPasswordHash`   | Product choice; OTP is the new normal                                          |
| Booking AI intake (`/booking-request/chat`) | Explicitly deferred; form path is go-live; ETL skips archive (MySQL dump only) |
| Customer assistant scaffold                 | Keep toggle off                                                                |
| AdminAssistant → `Chats` transform          | Archived; new admin assistant is separate                                      |
| Admin global search / concierge-tag queue   | Admin convenience                                                              |
| Partner self-serve layout builder           | Planned                                                                        |
| COOK_SCRAPE / Logs import                   | Ops tooling; dump retains logs                                                 |
| Auto cook payout job                        | Admin-gated by design                                                          |
| Chef public slug URLs                       | Ids work                                                                       |

### Now covered (no longer a cutover gap)

| Former gap                 | How                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| Legal CMS empty            | `legalImport` publishes DE markdown before Users                                                  |
| Scheduled jobs not rebuilt | `timeControlledTasksImport` → pg-boss                                                             |
| WebPages SEO archived only | `webPagesImport` upserts mapped keys                                                              |
| Newsletter archive-only    | Product table + footer subscribe                                                                  |
| WhatsApp `userId` / MEDIA  | ETL binds phone→user and sets `MEDIA` when attachments exist                                      |
| 48h reaction reminder      | Job + schedule on offer create/price/menus; cancel on accept/message/cancel                       |
| Cook public city           | `toGqlPublicCook` + chef search fall back to `legacyCityName` when exact travel origin city empty |
| Cook `stageName`           | Imported onto `Cooks.stageName`; public `user.display` prefers it. Predecessor `rank` dropped     |

### Freeze-day order (ops)

1. Freeze predecessor writes; keep `https://people-eat.com` image HTTP up.
2. `mysqldump` → snapshot Coolify Postgres → wipe/migrate schema → run ETL → verify.
3. Enable feature toggles; set `KLAVIYO_NEWSLETTER_LIST_ID` if ready.
4. Point webhooks; smoke OTP, booking pay, gift-card redeem, WA inbound, legal pages, sample chef/city media.
5. Add `/amex` redirect; announce passwordless login.
6. DNS / Coolify cutover.
7. Day-1 watch: acceptance dialogs only if legal was republished after import, job misses, Amex tickets. Keep MySQL dump ≥30 days before
   decommissioning Ionos media.

## Decisions

| Decision            | Choice                                                               |
| ------------------- | -------------------------------------------------------------------- |
| Gap doc vs ETL doc  | Separate cutover-gaps doc; ETL stays the pipeline source of truth    |
| Password continuity | Do not block cutover on password log-on; OTP + communication instead |
| Amex                | Redirect, not a rebuilt landing, for day one                         |

## Next steps / Ideas

- Wire `legacyPasswordHash` only if product wants email+password again
- Best-effort AdminAssistant → `Chats` / `ChatTurns`
- Klaviyo list backfill for imported newsletter rows

## Implementation

- ETL package: [`scripts/migrateFromPeopleEat/`](../../scripts/migrateFromPeopleEat/)
- ETL feature doc: [go-live-data-migration.md](./go-live-data-migration.md)
- Newsletter: [newsletter.md](./newsletter.md)
- Legal: [admin-legal.md](./admin-legal.md)
- Toggles: [admin-feature-toggles.md](./admin-feature-toggles.md)
- Auth: [../architecture/authentication.md](../architecture/authentication.md), [sign-in.md](./sign-in.md)
- WhatsApp: [whatsapp.md](./whatsapp.md)
- Env / deploy: [../infrastructure.md](../infrastructure.md)
