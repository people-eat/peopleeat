# Copy (voice)

Voice and wording rules for peopleeat UI and transactional email. Mechanics of bilingual strings (inline `{ de, en }[locale]`, no page-level
`COPY`, no raw `error.message`) live in [conventions.md](../conventions.md#bilingual-copy). Locale routing and profile language live in
[architecture/i18n.md](../architecture/i18n.md).

## Principle

**Write for the person reading the screen, not for the schema.** Labels, toasts, dialogs, empty states, and email body copy should match the
audience’s everyday language. Internal names (`Session`, `MutationResult`, GraphQL field names) stay in code and admin tooling.

## Audiences

| Surface                                              | Voice                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Public marketing, log-on, customer / cook profile UI | Plain language. Prefer outcomes and devices over platform jargon.                                                         |
| Account / security chrome (self-serve)               | Same as profile: “signed-in devices”, “sign out”, not “sessions” / “revoke”.                                              |
| Status banners and toasts                            | Calm and specific — see [status-messaging.md](./status-messaging.md).                                                     |
| Transactional email                                  | Same audience voice as the matching UI; layout rules in [emails.md](./emails.md).                                         |
| Admin shell                                          | Operational language is fine (`Sessions`, terminate, IDs, payloads). Operators need precision more than everyday wording. |

When the same concept appears in both admin and end-user UI, keep two labels. Example: admin **Sessions** vs account **Angemeldete Geräte**
/ **Signed-in devices**.

## Address form

- German: **Du** / **dein** (informal singular), not Sie.
- English: **you** / **your**.
- Prefer short, direct sentences. Questions for confirms (“Auf diesem Gerät abmelden?”) over abstract nouns.

## Wording habits

- **Map domain terms** before they hit the UI. If the product concept is a session cookie, the end-user label is still a device or browser.
- **Say what happens next.** Prefer “Gerät abmelden” / “Sign out” over “Beenden” / “Revoke” when the action ends a sign-in.
- **No mid-sentence em or en dashes (`—` / `–`)** in user-facing copy (ranges and empty placeholders are fine); see
  [conventions.md](../conventions.md#bilingual-copy).
- **Both locales are real copy.** Do not leave English loanwords in DE when a clear German word exists (`Geräte`, not “Devices” as a section
  title).
- **Never surface transport errors.** Map failures to a short bilingual outcome (“Gerät konnte nicht abgemeldet werden.”).

## Anti-patterns

- Shipping schema or API vocabulary on customer / cook screens (`Sitzung`, `Session`, `revoke`, `terminate`, `OTP` as a naked acronym in a
  heading when “code” is clearer).
- One shared label string reused for admin and self-serve when the audiences differ.
- Page-level `COPY` bags or i18n libraries — keep strings at the call site per conventions.

## Related

| Concern                         | Doc                                                                 |
| ------------------------------- | ------------------------------------------------------------------- |
| Bilingual string mechanics      | [conventions.md — Bilingual copy](../conventions.md#bilingual-copy) |
| Locale / time zone strategy     | [architecture/i18n.md](../architecture/i18n.md)                     |
| Status banner / toast tone      | [status-messaging.md](./status-messaging.md)                        |
| Email layout + preview subjects | [emails.md](./emails.md)                                            |
