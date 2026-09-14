# Klaviyo profile sync

Keep the Klaviyo audience list aligned with peopleeat accounts for future email marketing, without sending transactional mail through
Klaviyo.

## Behavior

On successful **sign-up** and on a verified **email-address change**, peopleeat upserts the user as a Klaviyo profile (email, name, optional
phone). Transactional mail (OTP, booking, gift cards, …) continues to go through Resend only.

Failed or delayed Klaviyo sync never blocks sign-up or email change. When the Klaviyo API key is unset (local/dev), sync is skipped.

Profiles are identified by peopleeat `userId` as Klaviyo `external_id`, so an email change updates the same marketing profile instead of
creating a duplicate.

Marketing list subscription for the footer newsletter is a separate path (`klaviyo.newsletterSubscribe` + optional
`KLAVIYO_NEWSLETTER_LIST_ID`) — see [newsletter.md](./newsletter.md). This profile sync still only upserts profiles.

## Decisions

### Alternatives considered

| Option                                   | Notes                                                                |
| ---------------------------------------- | -------------------------------------------------------------------- |
| Send transactional mail via Klaviyo      | Rejected — Resend owns delivery + admin audit (`OutboundEmails`)     |
| Fire-and-forget HTTP from the mutation   | Rejected — no retries; slows the request path                        |
| Match profiles by email only             | Rejected — email change would orphan or duplicate the marketing row  |
| Auto-subscribe to a Klaviyo list on sync | Deferred — needs explicit marketing consent                          |
| Official `klaviyo-api` SDK               | Rejected for one endpoint — thin `fetch` client matches Places style |

### Chosen

Queued job after commit: load the user, call create-or-update profile with `external_id` = `userId`. Private API key is required at boot.

## Next steps

- Bulk backfill existing users into Klaviyo (one-off admin / script)
- One-off list subscribe for imported `NewsletterSubscriptions` after `KLAVIYO_NEWSLETTER_LIST_ID` is set

## Implementation

### Env

| Variable                  | Role                                                |
| ------------------------- | --------------------------------------------------- |
| `KLAVIYO_PRIVATE_API_KEY` | Private key with `profiles:write`; required at boot |

### Module layout

| Path                                                 | Role                                    |
| ---------------------------------------------------- | --------------------------------------- |
| `src/server/klaviyo/Klaviyo.ts`                      | Capability interface                    |
| `src/server/klaviyo/klaviyoCreate.ts`                | `POST /api/profile-import/` via `fetch` |
| `src/server/jobs/handlers/userKlaviyoProfileSync.ts` | Load user → `klaviyo.profileUpsert`     |

### Triggers

| Command                       | When                                     |
| ----------------------------- | ---------------------------------------- |
| `userCreate`                  | After session bind on successful sign-up |
| `emailAddressUpdateOtpVerify` | After email + previous-address commit    |

Enqueue failures are logged and swallowed so product writes stay successful.

### Out of scope

Transactional email, list subscribe/unsubscribe, SMS marketing, historical bulk import UI.
