# Sign-in

Passwordless email OTP, optional Google, and passkeys establish a cookie session; the public entry is `/log-on` (sign-in and sign-up), with
`/sign-in` redirecting there.

## Behavior

1. Open `/log-on` (or `/en/log-on`), enter an email, and receive a six-digit code.
2. The OTP dialog reflects server state — reloading keeps it open while the code is valid. Closing the dialog soft-dismisses the pending OTP
   so it does not reopen; requesting the same email again sends the **same** code again (60s send cooldown) so a slow first delivery cannot
   be invalidated by a retry. A new code for the same address is limited to five per hour across sessions. An info `StatusAlert` reminds
   users to also check spam/junk if the email is missing.
3. **Existing email:** verifying the code binds the session to that user. If that user’s stored privacy/terms acceptance is older than the
   latest published versions, the identity gate stays on an inline **legal accept** step (`sessionAuthPhase` `legalPending`) and does
   **not** fire `onReady` (booking submit, gift-card pay, log-on redirect) until they agree. “Read full text” opens in a new tab so in-flow
   drafts are not abandoned. The root startup dialog still covers already-signed-in page loads — see
   [session-startup-gates.md](./session-startup-gates.md).
4. **New email:** verification marks the email as verified (~30 minutes) without creating a user yet. The UI shows the verified email (with
   discard) and a separate profile section. Submitting creates the account (name required; phone, birth date, and preferred communication
   optional on the schema but collected on most flows), records legal acceptance, binds the session, and consumes the OTP. Chef sign-up can
   create cook membership in the same step; existing customers upgrade via cook create. Discarding the verified ticket returns to the email
   step. Successful registration also enqueues a Klaviyo marketing profile sync (Resend remains the transactional mail path) — see
   [klaviyo-profile-sync.md](./klaviyo-profile-sync.md).
5. **Google** (`SIGN_IN_GOOGLE`, missing row = off) sits in the shared gate footer above Facebook and passkey on log-on, booking form,
   booking plan, gift-card, and chef sign-up. Clicking redirects to Google OIDC (`openid email profile`; People phone/birthday scopes only
   when `GOOGLE_OAUTH_PEOPLE_SCOPES=true`). Existing Google `sub` or verified email binds like OTP (TOTP still applies; `ANONYMIZED` is
   refused). New email writes a 30-minute `AuthOauthTicket` and prefills the register form (names always; phone and birth date only when
   those fields are visible). Gift-card (`requireProfileDetails={false}`) prefills names only and does not persist hidden Google phone or
   birth date. Returning Google sign-in never overwrites an existing profile. Failures toast once (`authError=google`) and mention Safari or
   Chrome when an in-app browser may have blocked Google.
6. **Facebook** (`SIGN_IN_FACEBOOK`, missing row = off) sits in the same footer after Google. Clicking redirects to Meta Facebook Login
   (`email,public_profile`). Existing Facebook `id` or email binds like OTP (TOTP still applies; `ANONYMIZED` is refused). Missing email
   from Graph fails like an unverified Google email (`authError=facebook`). New email writes a 30-minute `AuthOauthTicket` and prefills
   names only (no phone/birthday). Returning Facebook sign-in never overwrites an existing profile.
7. **Passkeys** sign in existing users only; after log-on, users may register additional passkeys on the account page. The shared
   `AuthPasskeyLogOn` control shows helper copy that passkeys are not for first-time users, and failure toasts point them back to email OTP.
8. **TOTP (optional):** when the account has a confirmed authenticator, email OTP, Google, Facebook, or passkey verify leaves the session
   unbound and opens the TOTP challenge (`Session.authTotpChallenge`). A valid app code or unused recovery code binds the session.
   Enable/disable is on the account page — see [account.md](./account.md) and [authentication.md](../architecture/authentication.md).
9. Signed-in visits redirect to a safe `returnTo` relative path when present, otherwise `/profile`.

Booking request form and chef sign-up reuse the shared identity gate (email → OTP or Google / Facebook → register). The booking form,
booking plan, gift-card purchase, and chef sign-up also offer Google and Facebook (when each toggle is on) and passkey log-on via the gate
footer. Chef sign-up includes travel cook fields. Gift-card purchase registers with name only.

## Decisions

### Alternatives considered

| Option                               | Notes                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Email + password                     | Rejected — forgotten-password / reset complexity; credential reuse risk; see auth ADR below       |
| Third-party auth libraries           | Extra layer on existing cookie sessions; Google / Facebook use fetch (Google + PKCE), not Auth.js |
| Auto-create user on OTP verify       | Placeholders and incomplete profiles                                                              |
| Verified email stored on session row | Duplicates OTP session state                                                                      |
| Custom GraphQL + email + WebAuthn    | Fits existing session binding                                                                     |

### Chosen

Custom GraphQL mutations, transactional email, SimpleWebAuthn, Google OAuth (authorization-code + PKCE), and Facebook Login
(authorization-code + Graph `/me`) on the existing session model, no separate auth framework. Passwordless email OTP is the primary path;
Google / Facebook for new and returning users when their toggles are on; passkeys for returning users; optional TOTP. Full rationale
(including unused imported password hashes):
[architecture/authentication.md](../architecture/authentication.md#why-passwordless-not-email--password).

## Next steps

| Capability             | Intent                                                                   |
| ---------------------- | ------------------------------------------------------------------------ |
| OTP expires-in display | Show remaining validity in the OTP dialog                                |
| Sign in with Apple     | Same OAuth tables and event shape; handle private-relay emails carefully |

Keep identity keyed by email. TOTP 2FA, Google, and Facebook are implemented. Enabling Google or Facebook in production means the published
privacy policy must mention that provider as a sign-in / profile-prefill processor. People phone and birthday scopes stay off
(`GOOGLE_OAUTH_PEOPLE_SCOPES=false`) until the Google Cloud consent screen is verified. Facebook stays off until the Meta consumer app is
Live with privacy, terms, and data deletion configured.

## Implementation

- At most one pending or verified OTP in `AuthEmailOtps` keyed by `sessionId`; UI seeds from `currentSession` and updates via
  `sessionUpdates`, plus an `AuthSession` re-read after each gate-owned mutation and a re-subscribe on tab resume (mobile SSE drops while
  the user is in their mail app — see [state-synchronization.md](../architecture/state-synchronization.md#session-owned-auth-ui)).
  Unverified dismiss sets `dismissedAt` (hidden from `Session.authEmailOtp`); same-email retry clears it and sends the stored code again.
- Registration ticket: `verifiedAt` for new emails; `consumedAt` when binding an existing user or after user create.
- Self-serve create requires name; phone, birth date, preferred communication optional on schema. When phone is provided it must be E.164
  with country code (`+49…`); `UserProfileForm` validates with shared `phoneNumberNormalize` before submit, and commands still run
  `phoneNumberAssert`. Log-on, booking, and chef sign-up collect them via `AuthIdentityGate` / `UserProfileForm` (`requireProfileDetails`,
  default true). Gift card omits them. Admin create requires full profile. Optional nested cook create or `UserMutation.cookCreate`. Minimum
  age **18** when birth date present (`src/shared/userBirthDate.ts`).
- Shared UI: `src/web/components/auth/` (`AuthIdentityGate`, `AuthEmailOtpFlow`, `AuthEmailOtpSpamHint`, `AuthGoogleLogOn`,
  `AuthFacebookLogOn`, `AuthIdentityGateLogOnFooter`, `AuthPasskeyLogOn`, `AuthTotpChallenge`, `UserProfileForm`, `sessionAuthPhase`) and
  `src/web/components/LegalAcceptancePanel.tsx`. `PreferredCommunicationField` on account. Terms + privacy checkboxes required on register.
  Email step uses TanStack Form with `z.email()`; OTP dialog supports Enter, paste, and auto-submit at six digits, with a shared spam/junk
  `StatusAlert`. Google then Facebook (each toggle-gated) then passkey sit in the gate `footer` on `/log-on`, booking form, booking plan,
  gift-card, and chef sign-up. `sessionAuthPhase` is `register` when OTP **or** an OAuth ticket has `verifiedAt`, `totpPending` after
  primary auth when TOTP is enabled, and `legalPending` when the bound user must accept the latest published privacy/terms
  (`User.legalAcceptance.required`). `onReady` runs only for `signedIn`. Shared legal copy and `userLegalAccept` live in
  `LegalAcceptancePanel` (inline in the identity gate; dialog wrapper is `LegalAcceptanceGate`).
- Google HTTP: `GET /api/auth/google` and `/api/auth/google/callback` (PKCE, restore session from `AuthOauthStates`, Set-Cookie on
  callback). Facebook HTTP: `GET /api/auth/facebook` and `/api/auth/facebook/callback` (authorization code + Graph `/me`, same state/cookie
  restore). GraphQL: `Session.authOauthTicket`, `authOauthTicketDelete`. Tables: `AuthOauthStates`, `AuthOauthTickets`,
  `AuthOauthIdentities`. Feature toggles `SIGN_IN_GOOGLE` / `SIGN_IN_FACEBOOK`. Admin usage on `/admin/analytics`; linked-method stock on
  `/admin/users`.
- Page: `src/web/pages/LogOnPage.tsx`, route `src/routes/{-$locale}/log-on.tsx` (noindex). `/sign-in` → `/log-on`.
- Transport and WebAuthn: [architecture/authentication.md](../architecture/authentication.md). Passkey verify returns `{ success: false }`
  for routine denials; log-on toasts on failure.

See also [profile.md](./profile.md), [booking-request-create.md](./booking-request-create.md), [cook-profile.md](./cook-profile.md).
