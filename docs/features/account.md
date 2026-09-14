# Account

Signed-in users manage profile picture, email, communication preference, language, time zone, passkeys, signed-in devices, and account
deletion from one settings page inside the profile or admin shell.

## Behavior

1. Open `/profile` while signed in and choose **Account** in the cook or customer sidebar footer → `/profile/account`.
2. Admins choose **Account** in the admin sidebar → `/admin/account`, staying in admin chrome.
3. Both routes render the same settings page (user-scoped, not role-scoped).

On the account page:

- Change or remove the profile picture (crop → upload → link).
- View the current email; change it via OTP to the new address (same passwordless pattern as log-on).
- Set preferred communication (message, WhatsApp, call, email) with immediate save.
- Switch language (Deutsch / English) via the shared LanguageSwitcher (cookie + URL path). Changing language while signed in opens a hard
  confirm when the route locale differs from `Users.locale` — confirm updates the profile (and emails); decline returns to the profile
  language. Emails and the UI use the same profile language.
- Set time zone (IANA) via a searchable combobox. Saves immediately with `userUpdate({ timeZone })`. UI date/time formatting and
  recipient-facing emails use `Users.timeZone` (see [i18n.md](../architecture/i18n.md)).
- List, add, and remove passkeys.
- Enable, confirm, and disable authenticator-app TOTP (QR + recovery codes).
- List signed-in devices; sign out another device; sign out here; sign out everywhere else.
- Delete account (customer copy) — see below.
- Stub for notifications.
- Link to terms and conditions.

Unsigned visits to `/profile/account` redirect via the parent profile loader. Admin account is gated by the admin loader.

**Email change**

Enter a new address → OTP emailed to the **new** address (same-email retry sends the same code again after the send cooldown) → verify
updates the account email and retires the previous address to admin-only history. The verify dialog (and the “code sent” toast) remind users
to check spam/junk via the shared `AuthEmailOtpSpamHint`. Invalid, unchanged, or already-registered addresses are rejected. Log-on OTP
verify rejects when already signed in so the two flows stay separate. A successful verify also enqueues a Klaviyo marketing profile sync
(same job as sign-up) so the audience list follows the new address — see [klaviyo-profile-sync.md](./klaviyo-profile-sync.md).

**Delete account (anonymization)**

Customer-facing copy is **delete account**. The server **anonymizes** the `Users` row so relational history (bookings, offers, chats keyed
by `userId`) stays joinable for chefs and operations.

On success the command:

1. Sets `Users.status = ANONYMIZED`, nulls `emailAddress`, clears `previousEmailAddresses`, blanks names, clears phone / birth date /
   preferred communication / profile picture.
2. Terminates all sessions for the user (and clears pending TOTP session state).
3. Deletes passkeys, TOTP secrets, and WebAuthn challenges.
4. Sets `Cooks.isVisible = false` when a cook row exists (biography, travel address, Stripe ids retained for now).
5. Publishes `userUpdates` + `adminUpdates` (self-serve also refreshes the current session).

`Users.emailAddress` is nullable for this reason: null is the explicit “do not email” signal so lifecycle jobs and outbound mail skip the
row instead of sending to a placeholder. GraphQL `User.emailAddress` / `AdminUser.emailAddress` are nullable accordingly. Auth (email OTP
verify, passkey authenticate, TOTP complete) rejects `ANONYMIZED` users and allows `ACTIVE` and `BANNED`. Banned users may sign in and see a
private profile restriction banner; marketplace writes (booking requests, offers, payments) require `ACTIVE`. Admin impersonation stays
ACTIVE-only. Ban/unban is `AdminMutation.userStatusUpdate` — see [admin-users.md](./admin-users.md).

Self-serve: `UserMutation.userAnonymize` from AccountPage → toast → hard-navigate via `redirectAfterSignOut`. Admin API:
`AdminMutation.userAnonymize(userId)` (detail danger zone).

| Section            | Status |
| ------------------ | ------ |
| Profile picture    | Live   |
| Email + OTP change | Live   |
| Preferred comms    | Live   |
| Language           | Live   |
| Time zone          | Live   |
| Passkeys           | Live   |
| Signed-in devices  | Live   |
| Two-factor (TOTP)  | Live   |
| Notifications      | Stub   |
| Legal link         | Live   |
| Delete account     | Live   |

## Decisions

### Alternatives considered

| Option                                                 | Notes                                              |
| ------------------------------------------------------ | -------------------------------------------------- |
| Shared top-level `/account`                            | Pulls admins out of admin shell                    |
| Separate cook and customer account URLs                | Duplicate surface; settings are user-scoped        |
| `/profile/account` + `/admin/account` sharing one page | Each shell keeps chrome; one component             |
| Placeholder email on anonymize                         | Risk of accidental outbound mail to fake addresses |
| Hard-delete the user row                               | Loses booking/offer history joins                  |

### Chosen

Profile and admin each expose account under their shell with a shared page component. Account deletion keeps the user row as `ANONYMIZED`
with a null email.

### Follow-ups

- **Cook PII depth**: biography, travel origin address, Stripe account ids still retained after hide-only (`isVisible = false`).
- **Booking/gift-card snapshots**: `BookingRequests.exactEventAddress` / invoice fields, `GiftCards.buyerEmail`, `OutboundEmails.toEmail`
  history are not scrubbed.
- **Klaviyo**: suppress/delete marketing profile on anonymize (today only upsert-on-sync; sync skips null email).
- **Chat/testimonial author display**: blank names may still surface as authors on old content — decide display rules for anonymized
  authors.

## Implementation

- Routes: `src/routes/{-$locale}/profile/account.tsx`, `src/routes/{-$locale}/admin/account.tsx`.
- Page: `src/web/pages/AccountPage.tsx` + `AccountPage.graphql`.
- Live state: `useUserUpdatesSeed` + `userUpdates`; session OTP via `useSessionUpdatesSeed` + `sessionUpdates`. Mutations must not
  `router.invalidate()` — passkey register and preferred communication publish `userUpdates` after commit.
- GraphQL: `User.sessions` / `passkeys` / `timeBasedOneTimePassword`; `Session.authEmailOtp`; `emailAddressUpdateOtpRequest` /
  `emailAddressUpdateOtpVerify`; TOTP enroll/confirm/cancel/disable; `userAnonymize`; reuse `authEmailOtpDelete`, `terminateSessions`,
  passkey mutations. Admin: `AdminMutation.userAnonymize`.
- TOTP UI: `AuthTotpAccountSection` (large QR via `qrcode.react`, manual secret, recovery codes copy/download).
- Sign-out / post-delete: terminate or anonymize then hard-navigate to `/log-on` so a fresh anonymous session remounts root probes (cookie
  banner, legal gate).
- Email skip helper: `emailAddressPresent` used by lifecycle/job send paths.

Commands: `userAnonymizeApply.ts`, `userAnonymize.ts`, `adminUserAnonymize.ts`, `emailAddressUpdateOtpRequest.ts`,
`emailAddressUpdateOtpVerify.ts`. Email template: `EmailAddressUpdateOtpRequestForUserEmail.tsx`. UI: `PreferredCommunicationField.tsx`,
`AuthEmailOtpSpamHint` on the email-change OTP dialog; `LanguageSwitcher` + `LocaleMismatchGate` (profile language on `Users.locale`);
`TimeZoneField` + `Users.timeZone` / `useTimeZone`. Klaviyo upsert job: `userKlaviyoProfileSync` (see
[klaviyo-profile-sync.md](./klaviyo-profile-sync.md)).

See also [profile.md](./profile.md), [customer-shell.md](./customer-shell.md), [cook-shell.md](./cook-shell.md), [sign-in.md](./sign-in.md),
[profile-pictures.md](./profile-pictures.md), [authentication.md](../architecture/authentication.md), [i18n.md](../architecture/i18n.md).
