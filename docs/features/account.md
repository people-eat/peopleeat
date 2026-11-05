# Account

Signed-in users manage their name, date of birth, phone number, profile picture, email, concierge preference, notification settings,
language, time zone, passkeys, signed-in devices, and account deletion from one settings page inside the profile or admin shell.

## Behavior

1. Open `/profile` while signed in and choose **Account** in the cook or customer sidebar footer → `/profile/account`.
2. Admins choose **Account** in the admin sidebar → `/admin/account`, staying in admin chrome.
3. Both routes render the same settings page (user-scoped, not role-scoped).

On the account page, settings sit in cards:

- **You**: photo, name, date of birth, and registration date on one row. The card has no title. The page heading is the shell breadcrumb.
- **How we reach you**: the email address (also the address used to sign in; change it via OTP to the new address) and the phone number
  (country code required, saved with `userUpdate`). Preferred communication (message, WhatsApp, call, email) is how the concierge reaches
  you, not which automatic messages are sent. Switch language and time zone.
- **Sign-in and security**: list, add, and remove passkeys. Enable, confirm, and disable authenticator-app two-factor (QR + recovery codes).
  List signed-in devices by browser and device. Signing out another device, signing out here, or signing out everywhere else each asks for
  confirmation first. The confirm button is destructive. Everywhere-else sits before sign-out-here, both at the end of the card. Add-passkey
  sits at the end of its section.
- **Notifications**: email and WhatsApp on or off per topic. Cook topics appear only when the account has a cook profile. Sign-in codes,
  payments, and support always go to the account email. See [notification-settings.md](./notification-settings.md).
- **Delete account** is the last card, with the action at the end of the card.
- Privacy, terms, and imprint stay as quiet links under the cards.

Language switches via the shared LanguageSwitcher (cookie + URL path). Changing language while signed in opens a hard confirm when the route
locale differs from `Users.locale`: confirm updates the profile (and emails); decline returns to the profile language. The interface,
emails, and WhatsApp use the same profile language. Time zone is an IANA zone in a searchable combobox and saves immediately with
`userUpdate({ timeZone })`. UI date/time formatting and recipient-facing emails use `Users.timeZone` (see
[i18n.md](../architecture/i18n.md)).

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

Self-serve deletion is two steps. **Send code** emails a one-time code to the current address (`userAnonymizeOtpRequest`). **Delete
account** checks that code and then anonymizes (`userAnonymize(code)`). Closing the dialog before the code is entered leaves the code
unused. Admin deletion stays `AdminMutation.userAnonymize(userId)` without the email step. Success toasts, then hard-navigates via
`redirectAfterSignOut`. On the user detail general tab, admins can also see and remove that account’s passkeys and authenticator
(`userPasskeyDelete`, `userTotpDelete`) and edit notification settings. See [admin-users.md](./admin-users.md).

On success the command:

1. Sets `Users.status = ANONYMIZED`, nulls `emailAddress`, clears `previousEmailAddresses`, blanks names, clears phone / birth date /
   preferred communication / notification settings / profile picture.
2. Terminates all sessions for the user (and clears pending TOTP session state).
3. Deletes passkeys, TOTP secrets, and WebAuthn challenges.
4. Sets `Cooks.isVisible = false` when a cook row exists (biography, travel address, Stripe ids retained for now).
5. Publishes `userUpdates` + `adminUpdates` (self-serve also refreshes the current session).

`Users.emailAddress` is nullable for this reason: null is the explicit “do not email” signal so lifecycle jobs and outbound mail skip the
row instead of sending to a placeholder. GraphQL `User.emailAddress` / `AdminUser.emailAddress` are nullable accordingly. Auth (email OTP
verify, passkey authenticate, TOTP complete) rejects `ANONYMIZED` users and allows `ACTIVE` and `BANNED`. Banned users may sign in and see a
private profile restriction banner; marketplace writes (booking requests, offers, payments, calls) require `ACTIVE`. That check lives on
`guardCookMutation` for every cook write and on the customer marketplace commands via `userActiveStatusAssert`. Account settings, support
requests, and assistant chat stay available. Admin impersonation stays ACTIVE-only. Ban/unban is `AdminMutation.userStatusUpdate` — see
[admin-users.md](./admin-users.md).

| Section                                            | Status |
| -------------------------------------------------- | ------ |
| You (name, birth date, registration date, picture) | Live   |
| Phone number                                       | Live   |
| Preferred comms                                    | Live   |
| Notifications                                      | Live   |
| Language                                           | Live   |
| Time zone                                          | Live   |
| Passkeys                                           | Live   |
| Signed-in devices                                  | Live   |
| Two-factor (TOTP)                                  | Live   |
| Legal links                                        | Live   |
| Delete account                                     | Live   |

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
- GraphQL: `User.sessions` / `passkeys` / `timeBasedOneTimePassword` / `createdAt`; `Session.authEmailOtp`; `emailAddressUpdateOtpRequest` /
  `emailAddressUpdateOtpVerify`; TOTP enroll/confirm/cancel/disable; `userAnonymizeOtpRequest` then `userAnonymize(code)`; reuse
  `authEmailOtpDelete`, `terminateSessions`, passkey mutations. Admin: `AdminMutation.userAnonymize`.
- Delete confirmation uses `AuthEmailOtps.purpose = ACCOUNT_DELETE` so the code does not open the email-change dialog. Email-change rows use
  `EMAIL_ADDRESS_UPDATE`. Log-on rows stay `LOG_ON`.
- TOTP UI: `AuthTotpAccountSection` (large QR via `qrcode.react`, manual secret, recovery codes copy/download).
- Sign-out / post-delete: terminate or anonymize then hard-navigate to `/log-on` so a fresh anonymous session remounts root probes (cookie
  banner, legal gate).
- Email skip helper: `emailAddressPresent` used by lifecycle/job send paths.

Commands: `userAnonymizeApply.ts`, `userAnonymize.ts`, `userAnonymizeOtpRequest.ts`, `adminUserAnonymize.ts`,
`emailAddressUpdateOtpRequest.ts`, `emailAddressUpdateOtpVerify.ts`. Email templates: `EmailAddressUpdateOtpRequestForUserEmail.tsx`,
`AccountDeleteOtpRequestForUserEmail.tsx`. UI: `PreferredCommunicationField.tsx`, `AuthEmailOtpSpamHint` on the email-change OTP dialog;
`LanguageSwitcher` + `LocaleMismatchGate` (profile language on `Users.locale`); `TimeZoneField` + `Users.timeZone` / `useTimeZone`. Klaviyo
upsert job: `userKlaviyoProfileSync` (see [klaviyo-profile-sync.md](./klaviyo-profile-sync.md)).

See also [profile.md](./profile.md), [customer-shell.md](./customer-shell.md), [cook-shell.md](./cook-shell.md), [sign-in.md](./sign-in.md),
[profile-pictures.md](./profile-pictures.md), [authentication.md](../architecture/authentication.md), [i18n.md](../architecture/i18n.md).
