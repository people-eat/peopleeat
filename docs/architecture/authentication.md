# Authentication

## Context

The application needs to identify users across requests without requiring an upfront login. Sessions must be established automatically on
first visit and persist across browser sessions.

## Decision

Cookie-based session management with automatic session creation on every GraphQL request.

### How It Works

1. Every request to `/api/graphql` or `/api/stream` calls `sessionUpsert()` before executing the GraphQL operation
2. `sessionUpsert()` reads the session ID from the cookie whose name is configured via `env.sessionCookie.name` (see
   [environment.md](./environment.md))
3. If a valid session exists (not terminated), it updates `lastInteractionAt` and returns the session
4. If no session exists or the session was terminated, a new session is created with `crypto.randomUUID()`
5. The response includes a `Set-Cookie` header to persist the session ID in the browser. The cookie is set `HttpOnly` so the session ID is
   not readable from JavaScript (mitigating XSS exfiltration), along with `Secure` + `SameSite=None` when `sessionCookieSecure=true`
   (production) and `SameSite=Lax` otherwise — see `createSetSessionCookie` in `src/server/utils/sessionUtils.ts`. SSR must forward the
   incoming cookie to `/api/graphql` over the public HTTPS origin (not `request.url`'s possibly-`http` value behind Coolify) or every
   document load mints a new session — see [api-layer.md](./api-layer.md#session--cookie-handover).

Marketing / analytics consent is separate: a `CookieSettings` row keyed by `sessionId` gates Google Analytics and Microsoft Clarity. That
consent is not the HttpOnly session cookie — see [cookie-consent.md](../features/cookie-consent.md).

### Session Lifecycle

- **Created**: automatically on first request. Create also stamps first-touch attribution from request headers: `referrer` (`Referer`),
  `landingPath` (`x-landing-path` from the SSR route loader), `ipHash` (`SHA256(VISITOR_IP_HASH_SALT + ":" + clientIp)` via
  `clientIpFromRequest`), and `isBot` (via `isbot` on `userAgent`).
- **Active**: `lastInteractionAt` updated on every request; `connectionActive` tracks real-time connections. Updates refresh `userAgent` /
  `ipHash` / `isBot` but leave `referrer` / `landingPath` untouched.
- **Terminated**: soft-deleted via `wasTerminatedAt` timestamp (row is preserved, not deleted)
- **User binding**: `userId` column exists on the session but is nullable — sessions start anonymous and can be linked to a user later.
  Email OTP / passkey / TOTP may bind `ACTIVE` or `BANNED` accounts; `ANONYMIZED` stays rejected. Marketplace mutations and admin
  impersonation still require `ACTIVE` — see [account.md](../features/account.md) and [admin-users.md](../features/admin-users.md).

### Key Files

- `src/server/utils/sessionUpsert.ts` — session creation and update logic
- `src/server/utils/clientIpFromRequest.ts` — client IP from `x-forwarded-for` / `x-real-ip`
- `src/server/utils/sessionUtils.ts` — cookie reading/writing helpers
- `src/server/db/schema.ts` — `Sessions` table definition
- `src/routes/api/graphql.ts` — session context wiring for queries and mutations
- `src/routes/api/stream.ts` — session context wiring for subscriptions
- `src/web/graphql/routeLoaderGraphqlClient.ts` — SSR loader forwards `x-landing-path` (+ `referer`) into `/api/graphql`

## Alternatives Considered

- **JWT tokens**: Stateless but harder to revoke, no server-side session state for real-time tracking
- **Third-party auth (OAuth providers)**: Adds external dependency; can be layered on top of sessions later (Google / Apple on the product
  roadmap)
- **Email + password**: Rejected for runtime log-on — see [Why passwordless](#why-passwordless-not-email--password)

## Consequences

- Every request hits the database for session upsert — acceptable given the PostgreSQL connection pool
- Sessions start anonymous, so user identity requires a separate linking step
- Soft-delete means the sessions table grows over time — may need a cleanup job eventually

## User sign-in (email OTP + passkeys)

Anonymous sessions become authenticated when a sign-in mutation binds `Sessions.userId`.

### Why passwordless (not email + password)

We previously supported email + password (with reset and confirmation edge cases). Runtime log-on is now **email OTP**, plus **passkeys**
for returning users and optional **TOTP** as a second factor.

| Why we switched                   | Detail                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Fewer credential leaks            | No long-lived password database to steal or reuse across sites                                 |
| No forgotten-password flow        | OTP request / verify replaces reset email, unconfirmed-email traps, and “no password” states   |
| Same session model                | Bind `Sessions.userId` after verify; no separate password credential store on the hot path     |
| Better fit for marketplace embeds | Booking form, gift-card purchase, and chef sign-up reuse one identity gate without password UI |

Imported accounts may still carry `Users.legacyPasswordHash` (bcrypt). That column is **not** verified at log-on — OTP / passkeys / TOTP are
the only runtime paths. We **keep** the column so email+password can be re-enabled later without another data recovery. Product surface:
[sign-in.md](../features/sign-in.md).

### Email OTP (passwordless)

1. `authEmailOtpRequest` inserts a session-owned row in `AuthEmailOtps` (HMAC `codeHash` + AES-GCM `codeEncrypted`, key derived from
   `AUTH_OTP_PEPPER`) and sends the plaintext code via Resend + React Email.
2. At most one pending OTP is exposed on `Session.authEmailOtp` (never the hash/ciphertext) so the log-on UI can survive reloads. A request
   for the **same** email reuses that row and sends the **same** code again after a 60s send cooldown (so late-arriving mail never
   invalidates an earlier code). A request for a **different** email replaces any prior unconsumed OTP for the session.
3. Mutations publish `sessionUpdates` on channel `session-updates:{sessionId}`; the UI seeds from `currentSession` and replaces state from
   the subscription (commands do not drive popup open/close).
4. Close / dismiss of an unverified OTP calls `authEmailOtpDelete`, which soft-dismisses (`dismissedAt`) so the dialog stays closed but a
   retry can still resend the same code. Discarding a verified registration ticket hard-deletes the row.
5. `authEmailOtpVerify` checks the hash:
   - **Existing user** — consume OTP (`consumedAt`), `sessionUserBind`.
   - **New email** — set `verifiedAt`, extend `expiresAt` (~30m registration ticket); **do not** create a `Users` row.
6. On the register step, discard (with confirmation) calls `authEmailOtpDelete` so a different email can be requested — same mutation as
   dismissing an unverified OTP.
7. `userCreate(input)` requires a verified, unconsumed session OTP; creates the user with name (phone, birthDate, and preferredCommunication
   optional on `UserCreate`; most public UIs still send them), stamps legal acceptance, binds the session, consumes the OTP. Optional
   `input.cook` (`CookCreate`) inserts cook membership in the same transaction. When provided, `birthDate` must meet the platform minimum
   age of 18 (`src/shared/userBirthDate.ts`). Admin `userCreate` still requires the full profile including an adult birth date (legal still
   accepted on first log-on); optional `AdminUserCreate.cook` uses the same `CookCreate` shape. After bind, `userCreate` enqueues
   `userKlaviyoProfileSync` so the marketing audience stays current — see [klaviyo-profile-sync.md](../features/klaviyo-profile-sync.md).
   Transactional OTP mail remains on Resend.

Public surface: `/log-on` (`/sign-in` redirects there for old bookmarks). Shared client gate: `src/web/components/auth/AuthIdentityGate`
(`requireProfileDetails` defaults true; gift-card purchase sets false).

### Passkeys (WebAuthn)

- Register (signed-in): `UserMutation.authPasskeyRegisterOptions` / `authPasskeyRegisterVerify` using `@simplewebauthn/server`.
- Sign-in: `authPasskeyAuthenticateOptions` / `authPasskeyAuthenticateVerify` (discoverable credentials).
- Manage (signed-in): `User.passkeys` + `UserMutation.authPasskeyDelete` on `/profile/account` or `/admin/account` (see
  [features/account.md](../features/account.md)).
- **Known denials** (expired / missing challenge, unknown credential, `verified: false`) return `{ success: false }` and `log.warn` — not a
  GraphQL error — so the client toast path stays clean and routine denials do not pollute error logs. Unexpected failures still `log.error`
  and throw.
- Relying party id / origin are derived from `WEB_PAGE_URL`.
- **`reflect-metadata` polyfill**: `@simplewebauthn/server` → `@peculiar/x509` → `tsyringe` needs `Reflect.getMetadata` before that graph
  evaluates. The app lists `reflect-metadata` as a direct dependency, imports it first in passkey command files / `graphql/server.ts`, and
  `vite.config.ts` (`reflectMetadataForTsyringe`) injects the polyfill into `tsyringe`'s entry so Nitro bundles it into the
  `peculiar__x509+tsyringe` chunk ahead of the Reflect check. Without that, Nitro leaves CJS `reflect-metadata` in the _importer_ chunk body
  while `@peculiar/x509` is a static ESM sibling import — production SSR then dies at `loadEntries` with
  `tsyringe requires a reflect polyfill`. See [infrastructure.md](../infrastructure.md#build-output-nitro--tanstack-start).

### TOTP (optional second factor)

Users may enable an authenticator app on `/profile/account` or `/admin/account`. Enrollment writes `AuthTimeBasedOneTimePasswords`
(encrypted secret; `confirmedAt` null until a valid code is shown). Confirm returns ten single-use recovery codes (hashed at rest with
`AUTH_OTP_PEPPER`); plaintext is shown once.

When a user with confirmed TOTP completes email OTP or passkey verify, the session is **not** bound immediately. Instead
`Sessions.pendingTotpUserId` / `pendingTotpExpiresAt` (15 minutes) are set and `Session.authTotpChallenge` is exposed. `authTotpVerify`
accepts a 6-digit TOTP or an unused recovery code, clears the pending fields, then `sessionUserBind`. Dismiss via `authTotpChallengeDelete`.

| Mutation                                                                                                  | Scope                                    |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `UserMutation.authTotpEnrollStart` / `authTotpEnrollConfirm` / `authTotpEnrollCancel` / `authTotpDisable` | Signed-in account                        |
| `authTotpVerify` / `authTotpChallengeDelete`                                                              | Anonymous session with pending challenge |

Own-user read: `User.timeBasedOneTimePassword` (`confirmedAt`, `recoveryCodesRemaining` — never the secret).

### Env

| Variable                   | Used by                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `EMAIL_TRANSPORT`          | `serverRuntime.email.send` — `resend` (default) or `console` (dev: log plaintext to terminal)  |
| `RESEND_API_KEY`           | Required at boot when `EMAIL_TRANSPORT=resend`                                                 |
| `RESEND_FROM_EMAIL`        | Required at boot when `EMAIL_TRANSPORT=resend` (display name = `SITE_NAME`)                    |
| `RESEND_WEBHOOK_SECRET`    | Required at boot when `EMAIL_TRANSPORT=resend`                                                 |
| `AUTH_OTP_PEPPER`          | OTP hash / verify; encrypt/decrypt for OTP reuse; TOTP recovery-code hashes — required at boot |
| `AUTH_TOTP_ENCRYPTION_KEY` | AES-256-GCM key (64 hex chars) for TOTP secrets — required at boot                             |

### Key files

- `src/server/commands/authEmailOtpRequest.ts` / `authEmailOtpVerify.ts` / `authEmailOtpDelete.ts` / `userCreate.ts`
- `src/server/email/templates/AuthEmailOtpRequestForUserEmail.tsx` (React Email template; bilingual + component previews via
  `npm run email:dev` — see [`docs/styles/emails.md`](../styles/emails.md))
- `src/server/commands/authPasskeyRegisterOptions.ts` / `authPasskeyRegisterVerify.ts` / `authPasskeyAuthenticateOptions.ts` /
  `authPasskeyAuthenticateVerify.ts` / `authPasskeyDelete.ts`
- `src/server/commands/authTotpEnrollStart.ts` / `authTotpEnrollConfirm.ts` / `authTotpEnrollCancel.ts` / `authTotpDisable.ts` /
  `authTotpVerify.ts` / `authTotpChallengeDelete.ts` / `sessionPrimaryAuthComplete.ts`
- `src/server/utils/authTotpUtils.ts`
- `src/server/commands/sessionUserBind.ts`
- `src/web/pages/LogOnPage.tsx` (route: `src/routes/{-$locale}/log-on.tsx`; `/sign-in` redirects)
- `src/web/components/auth/` — shared email/OTP/profile gate used by log-on, booking form, chef sign-up, gift-card purchase;
  `AuthEmailOtpSpamHint` on email OTP dialogs; `AuthPasskeyLogOn` as gate footer on log-on, booking form, and gift-card purchase (existing
  users only); `AuthTotpChallenge` when `sessionAuthPhase === 'totpPending'`; `AuthTotpAccountSection` on the account page
- `src/web/pages/AccountPage.tsx` (routes: `profile/account.tsx`, `admin/account.tsx`) — passkeys, TOTP, email-address change (OTP), session
  revoke / sign-out
- `docs/features/sign-in.md` / `docs/features/account.md`

### Email address change (signed-in)

1. `UserMutation.emailAddressUpdateOtpRequest` writes a session-owned `AuthEmailOtps` row and emails a 6-digit code to the **new** address
   (`EmailAddressUpdateOtpRequestForUserEmail`, purpose `EMAIL_ADDRESS_UPDATE_CONFIRM`).
2. Pending state is `Session.authEmailOtp` (same as log-on). Discard via `authEmailOtpDelete`.
3. `UserMutation.emailAddressUpdateOtpVerify(code)` updates `Users.emailAddress`, archives the previous address on
   `Users.previousEmailAddresses` (exposed only on `AdminUser`), and consumes the OTP. Log-on `authEmailOtpVerify` rejects when the session
   is already signed in.

### Planned next

OTP dialog “expires in …” countdown from `AuthEmailOtp.expiresAt` (not shipped yet), and Google and Apple sign-in (OAuth/OIDC → bind
existing or registration ticket for new emails). Product detail: [features/sign-in.md — Next steps](../features/sign-in.md#next-steps).
