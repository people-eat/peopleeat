# Newsletter

Footer marketing subscribe stores consent in `NewsletterSubscriptions` and optionally adds the email to a Klaviyo marketing list.
Transactional mail stays on Resend.

## Behavior

- Public footer form collects email + locale; mutation is session-scoped (anonymous OK).
- Duplicate emails return success (idempotent) with a session event.
- Go-live ETL imports predecessor `NewsletterSubscriptions` with `source = IMPORT`.
- When `KLAVIYO_NEWSLETTER_LIST_ID` is set, subscribe also calls Klaviyo profile-subscription bulk create for that list. When unset, the row
  is still stored locally.

## Decisions

| Topic              | Choice                                                     |
| ------------------ | ---------------------------------------------------------- |
| PK                 | nanoId (`newsletterSubscriptionId`); unique `emailAddress` |
| Klaviyo list       | Optional env; no boot failure when unset                   |
| Transactional mail | Remains Resend                                             |
| Consent            | Explicit footer form (not auto on signup)                  |

## Implementation

- Schema: `NewsletterSubscriptions` in `src/server/db/schema.ts`
- Command: `sessionNewsletterSubscriptionCreate`
- GraphQL: `Mutation.sessionNewsletterSubscriptionCreate`
- UI: footer form in `Footer.tsx` + `FooterNewsletter.graphql`
- Klaviyo: `klaviyo.newsletterSubscribe` in `klaviyoCreate.ts`
- ETL: `scripts/migrateFromPeopleEat/importDomains.ts`
- Env: optional `KLAVIYO_NEWSLETTER_LIST_ID` — see [infrastructure.md](../infrastructure.md)

See [klaviyo-profile-sync.md](./klaviyo-profile-sync.md), [go-live-data-migration.md](./go-live-data-migration.md).
