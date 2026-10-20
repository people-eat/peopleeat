# Sign-in

Passwordless email OTP and passkeys establish a cookie session; the public entry is `/log-on` (sign-in and sign-up), with `/sign-in`
redirecting there.

## Behavior

1. Open `/log-on` (or `/en/log-on`), enter an email, and receive a six-digit code.
2. The OTP dialog reflects server state — reloading keeps it open while the code is valid. Closing the dialog soft-dismisses the pending OTP
   so it does not reopen; requesting the same email again sends the **same** code again (60s send cooldown) so a slow first delivery cannot
   be invalidated by a retry. An info `StatusAlert` reminds users to also check spam/junk if the email is missing.
3. **Existing email:** verifying the code binds the session to that user.
4. **New email:** verification marks the email as verified (~30 minutes) without creating a user yet. The UI shows the verified email (with
   discard) and a separate profile section. Submitting creates the account (name required; phone, birth date, and preferred communication
   optional on the schema but collected on most flows), records legal acceptance, binds the session, and consumes the OTP. Chef sign-up can
   create cook membership in the same step; existing customers upgrade via cook create. Discarding the verified ticket returns to the email
   step. Successful registration also enqueues a Klaviyo marketing profile sync (Resend remains the transactional mail path) — see
   [klaviyo-profile-sync.md](./klaviyo-profile-sync.md).
5. **Passkeys** sign in existing users only; after log-on, users may register additional passkeys on the account page. The shared
   `AuthPasskeyLogOn` control (log-on, booking form, gift-card purchase) shows helper copy that passkeys are not for first-time users, and
   failure toasts point them back to email OTP.
6. **TOTP (optional):** when the account has a confirmed authenticator, email OTP or passkey verify leaves the session unbound and opens the
   TOTP challenge (`Session.authTotpChallenge`). A valid app code or unused recovery code binds the session. Enable/disable is on the
   account page — see [account.md](./account.md) and [authentication.md](../architecture/authentication.md).
7. Signed-in visits redirect to a safe `returnTo` relative path when present, otherwise `/profile`.

Booking request form and chef sign-up reuse the shared identity gate (email → OTP → register). The booking form and gift-card purchase also
offer passkey log-on via the gate footer (same control as `/log-on`); existing users with a passkey skip OTP. Chef sign-up includes travel
cook fields. Gift-card purchase registers with name only.

## Decisions

### Alternatives considered

| Option                               | Notes                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| Email + password                     | Rejected — forgotten-password / reset complexity; credential reuse risk; see auth ADR below |
| Third-party auth libraries           | Extra layer on existing cookie sessions; OAuth can layer later (Google / Apple next steps)  |
| Auto-create user on OTP verify       | Placeholders and incomplete profiles                                                        |
| Verified email stored on session row | Duplicates OTP session state                                                                |
| Custom GraphQL + email + WebAuthn    | Fits existing session binding                                                               |

### Chosen

Custom GraphQL mutations, transactional email, and SimpleWebAuthn on the existing session model — no separate auth framework. Passwordless
email OTP is the primary path; passkeys for returning users; optional TOTP. Full rationale (including unused imported password hashes):
[architecture/authentication.md](../architecture/authentication.md#why-passwordless-not-email--password).

## Next steps

| Capability             | Intent                                                                      |
| ---------------------- | --------------------------------------------------------------------------- |
| OTP expires-in display | Show remaining validity in the OTP dialog                                   |
| Sign in with Google    | OAuth; existing email binds; new email still completes profile via register |
| Sign in with Apple     | Same pattern; handle private-relay emails carefully                         |

Keep identity keyed by email; layer OAuth on the current model. TOTP 2FA is live.

## Implementation

- At most one pending or verified OTP in `AuthEmailOtps` keyed by `sessionId`; UI seeds from `currentSession` and updates via
  `sessionUpdates`. Unverified dismiss sets `dismissedAt` (hidden from `Session.authEmailOtp`); same-email retry clears it and sends the
  stored code again.
- Registration ticket: `verifiedAt` for new emails; `consumedAt` when binding an existing user or after user create.
- Self-serve create requires name; phone, birth date, preferred communication optional on schema. When phone is provided it must be E.164
  with country code (`+49…`); commands run `phoneNumberAssert`. Log-on, booking, and chef sign-up collect them via `AuthIdentityGate` /
  `UserProfileForm` (`requireProfileDetails`, default true). Gift card omits them. Admin create requires full profile. Optional nested cook
  create or `UserMutation.cookCreate`. Minimum age **18** when birth date present (`src/shared/userBirthDate.ts`).
- Shared UI: `src/web/components/auth/` (`AuthIdentityGate`, `AuthEmailOtpFlow`, `AuthEmailOtpSpamHint`, `AuthPasskeyLogOn`,
  `AuthTotpChallenge`, `UserProfileForm`, `sessionAuthPhase`). `PreferredCommunicationField` on account. Terms + privacy checkboxes required
  on register. Email step uses TanStack Form with `z.email()`; OTP dialog supports Enter, paste, and auto-submit at six digits, with a
  shared spam/junk `StatusAlert`. Passkey log-on is the gate `footer` on `/log-on`, the booking form auth step, and gift-card purchase.
  `sessionAuthPhase` includes `totpPending` after primary auth when TOTP is enabled.
- Page: `src/web/pages/LogOnPage.tsx`, route `src/routes/{-$locale}/log-on.tsx` (noindex). `/sign-in` → `/log-on`.
- Transport and WebAuthn: [architecture/authentication.md](../architecture/authentication.md). Passkey verify returns `{ success: false }`
  for routine denials; log-on toasts on failure.

See also [profile.md](./profile.md), [booking-request-create.md](./booking-request-create.md), [cook-profile.md](./cook-profile.md).
