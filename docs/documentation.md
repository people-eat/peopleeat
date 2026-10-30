# Documentation

Guide for the `docs/` directory — what to find where and what to put where.

## Structure

```text
docs/
├── documentation.md              # This file — docs directory guide
├── conventions.md                # How to work in this repo
├── infrastructure.md             # Deployment and CI
├── architecture/                 # Architectural decision records
│   ├── agent-delegation.md       # Orchestrator + in-process domain sub-agents
│   ├── api-layer.md              # Type-safe client-server API (GraphQL, route-loader SSR)
│   ├── authentication.md         # Session-based auth design
│   ├── authorization.md          # Guard-based access control
│   ├── authorization-admin.md    # Admins 1:1 table + guardAdmin / Admin GraphQL namespace
│   ├── browser-capture.md        # Playwright headless capture → image/PDF (not route SSR)
│   ├── e2e.md                    # Playwright multi-party UI e2e (not browser capture)
│   ├── stripe-payment.md         # Stripe Connect on ServerRuntime.stripe
│   ├── booking.md                # Booking requests / offers / offer events / call-slot bookings
│   ├── attention.md              # Server-derived badges / to-dos; clients only present
│   ├── outbound-email.md         # OutboundEmails table, send wrapper, Resend webhooks
│   ├── chat.md                   # Chat foundation — polymorphic message model
│   ├── chat-persistence.md       # Chat persistence — DB schema and AI SDK replay
│   ├── content-model.md          # Editable DB content + bilingual columns
│   ├── dependency-injection.md   # Dependency injection container (ServerRuntime)
│   ├── discovery-geo.md          # GEO — llms.txt, JSON-LD, AI bot allowlist
│   ├── discovery-seo.md          # SEO standards — seoMeta() helper, dynamic sitemap.xml, robots.txt
│   ├── environment.md            # Validated EnvironmentVariables (no direct process.env)
│   ├── file-storage.md           # Postgres FileUploads + shared Garage object store (OBJECT_STORAGE_S3_*)
│   ├── image-delivery.md         # Client WebP presets, AppImage, public WebP; follow-ups (variants / CDN)
│   ├── i18n.md                   # DE / EN locale strategy
│   ├── jobs.md                   # pg-boss background jobs
│   ├── logging.md                # PostgreSQL-backed logger
│   ├── observability.md          # OpenTelemetry, Langfuse, Grafana APM, slow SQL
│   ├── session-events.md         # First-party session analytics events
│   ├── server-architecture.md    # Server-side domain logic structure (CQRS)
│   └── state-synchronization.md  # Client-server state sync via subscriptions
├── styles/                       # Visual / interaction design rules
│   ├── chat.md                   # Desired chat experience (scroll, composer, transcript)
│   ├── copy.md                   # Voice / wording (end-user vs admin language)
│   ├── motion.md                 # Motion principle, guardrails, reduced-motion
│   ├── navigation-progress.md    # Top-of-viewport nav progress bar
│   ├── theme.md                  # Light-only palette
│   ├── status-messaging.md       # Status tones, badges, banners
│   ├── fonts.md                  # DM Sans (body + titles; separate tokens)
│   ├── emails.md                 # Transactional email layout + shared React Email components
│   ├── sign-in.md
│   └── …
├── features/                     # Implemented feature documentation
│   ├── chat.md                   # Thin index only — not a third chat product
│   ├── booking.md                # Thin index — marketplace booking journey + slice links
│   ├── booking-request-create.md # Form, publication, customer request surfaces
│   ├── booking-request-plan.md   # Alternative 2-step plan funnel (partner deep-link)
│   ├── booking-offers.md         # Cook pool, offer create, dual accept, negotiation
│   ├── ai-menu-evaluation.md     # AI menu ranking + inventory recommendation on pool open
│   ├── ai-booking-request-message.md # AI cook-facing booking-request message rewrite
│   ├── booking-offer-chat.md     # Offer timeline chat, concierge, phone block
│   ├── admin-offer-chat-review.md # Post-hoc admin review pipeline for offer chats
│   ├── booking-payment.md        # Checkout, pull payment, cook payout
│   ├── booking-offer-participant-amendment.md # Post-accept headcount change + prep lock
│   ├── cook-arrival-identity-verification.md # QR host check when cook arrives (idea)
│   ├── booking-request-share.md # Readonly share link for family / friends (idea)
│   ├── booking-request-offer-calls.md # LiveKit discovery calls + slots
│   ├── call-recordings.md        # Call audio egress + transcripts (Garage + admin UI)
│   ├── assistants.md             # Audience agent factories (scaffolds; wiring pending)
│   ├── product-overview.md       # peopleeat product framing
│   ├── chat-titles.md            # Auto-generated chat titles
│   ├── klaviyo-profile-sync.md   # Marketing profile upsert (not transactional mail)
│   ├── newsletter.md             # Footer newsletter subscribe + NewsletterSubscriptions
│   ├── about-us.md               # Public about-us story / team / join CTA
│   ├── landing.md                # Public home / landing marketing sections
│   ├── how-to-become-a-chef.md   # Public chef recruitment page
│   ├── gift-card-purchase.md     # Gift-card purchase (Stripe + reCAPTCHA)
│   ├── admin-gift-cards.md       # Admin gift-card overview + list + detail
│   ├── admin-file-store.md       # Admin Garage/S3 object browse (`/admin/file-store`)
│   ├── admin-jobs.md             # Global pending scheduled jobs (`/admin/jobs`)
│   ├── admin-users.md
│   ├── admin-sessions.md
│   ├── admin-analytics.md        # Booking funnel Sankey + visit buckets
│   ├── admin-logs.md
│   ├── admin-database-slow-statements.md # pg_stat_statements top-N via Admin GraphQL
│   ├── admin-outbound-emails.md
│   ├── admin-booking-requests.md # Booking-request list + detail
│   ├── admin-promo-codes.md      # Promo code list + create
│   ├── admin-legal.md
│   ├── admin-web-pages.md        # Fixed-route SEO titles/descriptions
│   ├── admin-feature-toggles.md  # Fixed-key on/off feature toggles
│   ├── admin-shell.md            # Floating sidebar admin chrome
│   ├── admin-global-search.md    # Admin ⌘K palette (pages shipped; entity search planned)
│   ├── session-startup-gates.md  # Root locale → legal → cookie pipeline
│   ├── route-errors.md           # Customer route error page (replaces TanStack default)
│   ├── cookie-consent.md         # Session cookie banner + analytics gating
│   ├── cook-shell.md             # Floating sidebar cook profile chrome
│   ├── cook-meals.md             # Cook meal list/create/edit + admin meals
│   ├── cook-menus.md             # Cook menu list/create/edit + admin menus
│   ├── customer-shell.md         # Floating sidebar customer profile chrome
│   └── …
└── assets/                       # Diagrams, images, and other media (may be empty)
```

## What Goes Where

### `architecture/`

One file per architectural decision. Each document should cover:

- **Context** — what problem the decision addresses
- **Decision** — what was chosen and why
- **Alternatives considered** — what was rejected and why
- **Consequences** — trade-offs accepted

Add a new file when introducing a fundamentally new pattern, technology, or structural choice. These documents should remain stable over
time — they describe _why_ the system is shaped the way it is, not _how_ to use it day-to-day.

When you add a new architecture doc, also add a row to the Architecture table in [`AGENTS.md`](../AGENTS.md).

### `styles/`

Presentation and interaction rules that hold across surfaces — motion, navigation chrome, copy voice, and the desired chat experience. Not
ADRs: these describe the bar every UI surface should meet. peopleeat keeps `theme.md`, `fonts.md`, and `copy.md` as the source of truth for
palette, typography, and wording voice.

### `features/`

One file per user-facing feature, added once the feature is implemented (or when a planned surface needs a home). Use this exact section
order:

```markdown
# {Feature name}

One-sentence product summary.

## Behavior

## Decisions

### Alternatives considered

### Chosen

## Next steps

## Ideas

## Implementation
```

**Hard cut at `## Implementation`:**

| Above `## Implementation` (product)                  | From `## Implementation` down (engineering)                   |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| Roles, journeys, screens, user-facing email outcomes | Tables, enums, mutations, jobs, mappers, file paths, env vars |
| Product / UX / marketplace alternatives              | Engineering alternatives belong in `architecture/` ADRs       |
| Next steps / Ideas in product language               | How it is built                                               |

Omit **Next steps** or **Ideas** when empty. Do not invent a Decisions block for thin **index** docs
([`features/chat.md`](./features/chat.md), [`features/booking.md`](./features/booking.md)) that only point elsewhere.

**Admin AI / product wiki:** the admin assistant loads a read-only wiki from `docs/features/` (slim slug index in the system prompt;
`productDocsRead` fetches full pages). Ingest only the content **above** `## Implementation`. Never embed Implementation sections into
admin-facing assistants. See [assistants.md](./features/assistants.md).

Features are different from architecture: architecture describes structural decisions that affect many features; features describe specific
end-to-end functionality built on top of that architecture.

**Standalone product voice:** Document peopleeat on its own terms. Decisions and alternatives must explain _why this product works this way_
(UX, ops, security, cost). Do not justify a choice by citing a predecessor, “old app,” or “parity with people-eat.”

Historical evolution is welcome when it explains a real product change — name what we used to do, what we do now, and why we switched.
Example (auth): “We previously used email + password; we switched to email OTP (plus passkeys / optional TOTP) because …” Import-preserved
columns and historical SessionEvents stay factual (“import-preserved,” “no longer produced”) without using an old product as the reason for
current design.

Chat is split across foundation ([architecture/chat.md](./architecture/chat.md)), persistence
([architecture/chat-persistence.md](./architecture/chat-persistence.md)), presentation ([styles/chat.md](./styles/chat.md)), and satellites
such as [chat-titles.md](./features/chat-titles.md). [`features/chat.md`](./features/chat.md) is only a thin index of those homes — not a
third product doc.

Booking is split across [`features/booking.md`](./features/booking.md) (index) plus create / offers / offer-chat / payment slices, admin
booking ops, and call satellites.

Capability slices that are not standalone products may live as satellite feature docs or sections of the parent feature — prefer folding
into the parent when the slice has no independent user journey.

### `conventions.md`

Living document for working agreements: naming, file organization, tooling workflows, things not to touch. Update it whenever a new
convention is established.

### `infrastructure.md`

Deployment pipeline, CI configuration, environment setup. Update it when the deployment or CI process changes.

### `assets/`

Supporting media referenced from other docs (diagrams, screenshots). Name files to match the doc they support (e.g., `state-sync-flow.png`
for `architecture/state-synchronization.md`). The folder may be empty until diagrams exist.
