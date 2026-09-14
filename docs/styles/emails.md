# Emails

Transactional emails are React Email templates under `src/server/email/`. Every template shares one visual shell so OTP, gift cards, email
address confirmation, and future mail look like the same product.

Layout:

| Path                | Role                                                        |
| ------------------- | ----------------------------------------------------------- |
| `email/templates/`  | Sendable `{Sender}For{Audience}Email` modules               |
| `email/components/` | Shared shell (`EmailLayout`, …), styles, and markup helpers |
| `email/previews/`   | React Email `email:dev` sidebar (default exports only)      |

## Anatomy

| #   | Block     | Component         | Notes                                                                           |
| --- | --------- | ----------------- | ------------------------------------------------------------------------------- |
| 1   | Header    | `EmailHeader`     | Centered `SITE_LOGO` wordmark (same asset as site header / footer)              |
| 2   | Hero      | optional `hero`   | Illustration between logo and subject (e.g. offer-chat new-message icon)        |
| 3   | Subject   | `EmailHeading`    | Bold title — usually matches the SMTP subject                                   |
| 4   | Greeting  | `EmailGreeting`   | DE `Hallo {firstName},` / EN `Hey {firstName},` — omit name → `Hallo,` / `Hey,` |
| 5   | Body      | template children | Template-specific copy; use `EmailText` for paragraphs                          |
| 6   | CTA       | `EmailButton`     | Centered primary action — mirrors web `Button` default variant                  |
| 7   | Questions | `EmailQuestions`  | “Du hast Fragen?” + `SITE_CONTACT_EMAIL` mailto                                 |
| 8   | Sign-off  | `EmailSignOff`    | “Liebe Grüße,” / peopleeat team + heart                                         |
| 9   | Footer    | `EmailFooter`     | Centered Instagram icon → `SITE_INSTAGRAM_URL`                                  |

Compose with `EmailLayout` — it wires 1–4 and 7–9 around the body children (optional `hero` between logo and subject). Put CTAs in the body
with `EmailButton` (do not hand-roll styled `<a>` tags for primary actions).

Every template **must** pass a bilingual `preview` string to `EmailLayout`. Inbox clients show it next to the subject; write it so the
recipient wants to open the mail (concrete benefit, name, or next step) rather than delete it. Avoid bland status lines (“Anfrage
eingegangen”) and scary charge copy without context. OTP previews may include the code so the user can act from the inbox.

## Preview (`npm run email:dev`)

React Email shows **one sidebar entry per file with a default export** (raw filename — there is no custom display-name API). Bilingual +
component isolation therefore lives under `src/server/email/previews/` (the `email:dev` `--dir`), grouped by domain so the sidebar stays
scannable. Preview filenames drop folder-redundant prefixes and keep **`{action}-for-{audience}.{locale}.tsx`** so labels fit the sidebar.

| Folder                      | What you see                                                                     |
| --------------------------- | -------------------------------------------------------------------------------- |
| `previews/_components/`     | Shared building blocks in isolation (DE / EN when copy differs); `_` sorts first |
| `previews/auth/`            | Auth OTP + email-address update confirmation                                     |
| `previews/booking/`         | Booking-request lifecycle (create / update / cancel / cooks-notify)              |
| `previews/offers/`          | Offer create / menus update / accept / decline / chat-message notify             |
| `previews/payments/`        | Payment finalize + pull-payment announcement                                     |
| `previews/call-scheduling/` | Call-slot lifecycle (request / confirm / decline / cancel / reminder)            |
| `previews/gift-cards/`      | Gift-card purchase / delivery                                                    |
| `previews/testimonials/`    | Post-event testimonial reminder nudges                                           |
| `previews/support/`         | Support-request create / admin reply / resolve (customer)                        |
| `previews/cook-profile/`    | Cook admin approval                                                              |

Add new templates under `previews/{domain}/`. Shared sample props and the minimal isolation shell are in `previews/emailPreviewUtils.tsx`.
Run `npm run dev` alongside the previewer so logo / Instagram assets at `EMAIL_PREVIEW_WEB_PAGE_URL` (`http://localhost:3000`) resolve.

Deployed preview: `https://email.people-eat.com` (Coolify, Basic Auth). The image bakes
`EMAIL_PREVIEW_WEB_PAGE_URL=https://demo.people-eat.com` at build time — see
[infrastructure.md](../infrastructure.md#storybook--email-preview-coolify). Local scripts: `npm run email:dev`, `npm run email:build`,
`npm run email:start`.

When you add a template or a reusable email component, add matching preview files (DE + EN when the surface has locale copy).

## Fonts

Match the site families from [`fonts.md`](./fonts.md):

| Role                        | Family      | Email stack                                          |
| --------------------------- | ----------- | ---------------------------------------------------- |
| Body / greeting / sign-off  | **DM Sans** | `components/emailStyles.ts` (`emailFontSans`)        |
| Subject / questions heading | **DM Sans** | `components/emailStyles.ts` (`emailFontSerif` alias) |

Body and title stacks stay separate in `emailStyles.ts` (mirroring `--font-sans` / `--font-serif`) so a display face can be swapped in
later. Both currently use DM Sans.

The website self-hosts fonts via Fontsource. Email clients cannot load those files, so `EmailLayout` links DM Sans from the Google Fonts
CDN. Clients that strip remote fonts (notably Gmail web) fall back to Helvetica.

## Colors

Use the hex values in `components/emailStyles.ts` — they mirror [`theme.md`](./theme.md) (`text` `#040316`, page canvas `#fffdf9`, white
content surface, primary `#404040`). Do not invent a second email palette. Inline styles are required here; Tailwind tokens do not survive
email clients.

## Assets

- Logo: `SITE_LOGO` (`/logo/peopleeat.png`) — absolute URL via `emailAssetUrl(webPageUrl, path)`.
- Instagram icon: `SITE_EMAIL_INSTAGRAM_ICON` (`/email/instagram.png`).
- Offer-chat hero: `SITE_EMAIL_NEW_MESSAGE_ICON` (`/email/new-message.png`).
- Branding constants live in `src/shared/siteBranding.ts` (re-exported by `seoConstants` for web chrome).

Always pass `webPageUrl` from `environmentVariables.webPageUrl` so images resolve in production.

## Naming

Sendable templates follow **`{Sender}For{Audience}Email`** — full rule in
[conventions.md § Email template naming](../conventions.md#email-template-naming). Examples: `GiftCardPayForCustomerEmail`,
`BookingRequestCooksNotifyForCookEmail`, `AuthEmailOtpRequestForUserEmail`, `BookingRequestOfferCallSlotRequestForCookEmail`.

`OutboundEmailPurpose` values are separate persisted classifiers; do not rename existing ones just to match a template rename.

## Authoring a new template

1. Add `src/server/email/templates/{Sender}For{Audience}Email.tsx` (named export; no default / `PreviewProps` on the production module).
2. Wrap content in `EmailLayout` with `locale`, `webPageUrl`, `preview`, `subject`, optional `recipientFirstName` / `hero`.
3. Put body copy in `EmailText` (and other React Email primitives only when needed). Use `EmailButton` for the primary CTA.
4. Export `{sender}For{Audience}EmailSubject(locale)` for the SMTP subject (camelCase of the component stem).
5. Add preview wrappers under `previews/{domain}/` as `{action}-for-{audience}.de.tsx` / `.en.tsx` default exports (short names; the folder
   already carries domain context).
6. Send via `serverRuntime.email.send({ to, subject, react, purpose, … })` from the matching command, job, or send util.

## Rules

- Do not hand-roll a second header / footer / questions / primary CTA block inside a template — extend the shared components.
- Keep bilingual copy as inline `{ de: '…', en: '…' }[locale]` at the call site (same as the web).
- Match audience voice from [copy.md](./copy.md) (plain language for customers/cooks; admin-facing sends may stay operational).
- Never put secrets or raw `error.message` in email copy.
- One audience per sendable file; share identical markup via `email/components/` when a sender fans out to two roles.
- Preview with `npm run email:dev` before shipping a new template or email component.
