# Admin legal texts

Versioned German privacy, terms, and imprint with draft editing, publish immutability, and a blocking acceptance gate for signed-in users.

## Behavior

### Public

`/imprint`, `/privacy-policy`, and `/terms-and-conditions` (and `/en/…`) render the latest **published** German markdown body in the
standard public shell via `MarkdownBody` (Streamdown with link-safety confirmation **off**, so authored links open without an interstitial).
Until published, a short bilingual “not published yet” message. UI chrome is bilingual; legal body stays German on both locales until
English columns exist.

### Signed-in acceptance gate

Every signed-in user (including admins) with outdated or missing privacy/terms acceptance sees a **non-dismissible** dialog: change
summaries, links to full public pages, **Accept**, and **Sign out** (allowed while pending). Imprint is not gated. Gate is suppressed on
privacy/terms routes so “read full text” works. Accept stamps both acceptance times to now. In the root startup pipeline the legal dialog is
second (after locale mismatch, before the cookie banner) — see [session-startup-gates.md](./session-startup-gates.md).

### Registration

Self-serve registration requires terms + privacy checkboxes; timestamps set at registration. Admin-created users leave acceptance null →
dialog on first sign-in once docs exist.

### Admin `/admin/legal`

Overview explains draft → publish, immutability, and the gate; shared nav cards (title + blurb + chevron) link to privacy, terms, imprint
hubs.

Per kind hub: draft card + published version cards (draft excluded from version list). **Create draft** inserts one unpublished row seeded
from latest published body (or empty) and navigates to draft editor. Fails if draft already exists.

Draft editor: markdown + live preview, **Changes** tab (source diff vs published), unsaved badge, save shortcut, save requires existing
draft (trimmed body ends with newline). Publish requires non-empty body and change summary.

Published version pages are read-only; draft ids redirect to draft route. Newest published is **Current**. Published rows are immutable.

## Decisions

### Alternatives considered

| Option                                   | Pros                    | Cons                          |
| ---------------------------------------- | ----------------------- | ----------------------------- |
| Redirect to dedicated accept route       | Strong isolation        | Loses page context            |
| Blocking dialog (chosen)                 | Keeps URL and context   | Must allow sign-out           |
| EN+DE columns now                        | Ready for EN            | Legal translation risk        |
| German-only columns, extensible (chosen) | Honest about EN body    | EN locale shows DE legal text |
| Shared public/admin GraphQL shape        | One type                | Draft fields leak concerns    |
| Split public vs admin types (chosen)     | Public always published | More schema surface           |
| Query-param kind switch                  | One route file          | Weak deep links               |
| Dedicated sub-pages (chosen)             | Clear hubs and editors  | More thin routes              |
| Always-open editor on hub                | Fewer clicks            | Crowded hub                   |
| Hub + draft + version routes (chosen)    | Editor when writing     | Extra routes per kind         |
| Create-on-save upsert                    | Fewer mutations         | Accidental drafts             |
| Explicit create + update (chosen)        | Intentional draft seed  | Extra mutation per kind       |
| Rendered HTML diff                       | Page-like               | Formatting noise              |
| Source markdown diff on draft (chosen)   | Matches editor          | Draft-only diff UI            |

### Chosen

Blocking dialog + German `*De` columns + draft/publish versioning + server hard-gate on mutations (except accept and terminate sessions) +
separate public and admin GraphQL types + explicit draft create (seed from published), draft update, publish (non-empty body and summary).

## Implementation

- Schema: privacy, terms, imprint version tables; user last-accepted timestamps
- GraphQL: public legal queries; user legal acceptance; admin legal lists/detail; draft create/update/publish mutations
- Commands / mappers / queries per kind under server directories; create uses latest-published helper in utils (commands do not import
  queries)
- Gate: `LegalAcceptanceGate` via `SessionStartupGates` on root layout
- Admin UI: overview, kind hub, draft editor with diff tab, published version view; routes under `admin/legal`
- Hard gate: `assertLegalAcceptanceCurrent` on user and admin mutations (except accept paths)

Live updates: admin legal mutations publish admin updates; pages seed from loader and replace from subscription (no refetch).

See [admin-shell.md](./admin-shell.md), [sign-in.md](./sign-in.md), [admin-users.md](./admin-users.md).
