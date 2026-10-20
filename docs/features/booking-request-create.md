# Booking request create

Customers create booking requests; the platform publishes them to cooks (or holds large groups for admin review).

## Behavior

1. Customer opens `/booking-request/form` and walks a multi-step wizard: occasion → party → venue → datetime → price class → preferences →
   (when `BOOKING_REQUEST_RESTRICTIONS` is on) dietary restrictions per guest → message (optional redeem code). On the venue step, signed-in
   customers with prior requests see up to five distinct previous event addresses as quick-select chips (newest first); they can still enter
   a new address via the Combobox. On the datetime step, a success banner praises early booking when the selected date is more than 3 weeks
   out (Europe/Berlin calendar days). Time uses `TimePicker`: native `type="time"` on small viewports; from
   `md` up, hour (8–23) and minute (`:00` / `:15` / `:30` / `:45`) dropdowns. Draft answers survive refresh and auth redirects via the URL
   (restriction selections stay in form state only). Cooks are redirected to `/profile` (header **Send request** CTA is already hidden for
   them); `UserMutation.bookingRequestCreate` also rejects cook callers.
2. Anonymous users complete identity before submit: email OTP (+ profile for new accounts), or passkey for existing users who already
   registered one (skips OTP). Helper copy explains passkeys are not for first-time users. The auth step uses the same sticky Back / Next
   chrome as other wizard steps; on create-profile, Next is **Create account** (always enabled, validates and scrolls to the first invalid
   field on click). Signed-in users submit from the message step.
3. On create, the customer lands on `/booking-request/$id/submitted` (reload-stable: id in the path, ownership re-checked from the server).
   That page confirms the request, explains what happens next (chefs create offers → customer is notified via email and WhatsApp when we
   have their number → customer chooses), and links to the request detail. The customer also receives a confirmation email. Ordinary groups
   are published to cooks in travel radius (email + live notify). Large groups (≥12 participants) stay blocked for admin review until an
   admin approves and selects which cooks to notify.
4. Customer manages owned requests at `/profile/booking-requests` (list cards show event date, cook avatar chips linking into each offer,
   and unread; exact time is on detail) and `/profile/booking-requests/$id` (detail, offer preview cards, discount and support tabs). Detail
   shows per-guest restrictions when present. Edit and cancel are available when the lifecycle allows; edit can change restrictions when the
   toggle is on (otherwise existing restriction values are preserved). Cancel may offer a churn discount before confirming.
5. Editing the venue can preview travel impact on existing offers; edits that reset cook acceptance notify those cooks.
6. Route stubs `/booking-request` and `/booking-request/chat` stay out of search indexes until an intake-chat product ships.

Admin create / publication approve / notify flows: [admin-booking-requests.md](./admin-booking-requests.md). Journey index:
[booking.md](./booking.md).

## Decisions

### Alternatives considered

| Approach                                    | Notes                                                              |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Form-first intake                           | **Chosen** — predictable, shareable draft URL, works without AI    |
| Chat-first intake (`/booking-request/chat`) | Deferred — heavier to operate; agent scaffold exists but not wired |
| Store approximate location + exact address  | Rejected — exact venue only; cooks need a real address for travel  |
| Auto-publish every group size               | Rejected — large groups need selective cook outreach               |
| Per-participant dietary step always on      | Rejected — gate with `BOOKING_REQUEST_RESTRICTIONS`                |
| Per-participant dietary step (feature flag) | **Chosen** — progressive disclosure chips + optional custom text   |

### Chosen

Multi-step public form with URL draft sync, email-OTP or passkey gate for anonymous users, auto-publish for ordinary groups, and admin-gated
publication for large groups. Dietary restrictions are an optional wizard step (and customer/admin edit section) when
`BOOKING_REQUEST_RESTRICTIONS` is enabled; create/update strip non-empty restrictions when the toggle is off. Intake chat remains a later
idea under [Ideas](#ideas).

## Next steps

1. **High — Customer publication status** — Show customers when a large-group request is waiting on admin review vs approved (today only
   admins see publication state).
2. **Medium — Partner deep-link venue defaults** — Resolve `?partnerId=` on form load (see [partners.md](./partners.md)).

## Ideas

### Intake chat

Conversational create at `/booking-request/chat` (AI-assisted). Do not add intake-chat tables until this is scheduled. See
[assistants.md](./assistants.md).

### Holiday-aware list banners

On `/profile/booking-requests`, name the next cultural occasion (Valentine’s, Mother’s Day, …) and optionally prefill form occasion /
datetime via search params. Fixed calendar helper — no CMS for a first slice.

## Implementation

### Data model (request side)

| Table                        | Purpose                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `BookingRequests`            | Request header; `exactEventAddress` only; `publicationStatus`; optional `giftCardId` / `promoCodeId` / `invoiceAddress`; Slack `references` |
| `BookingRequestParticipants` | `ADULT` / `DISCOUNTED`, name, `restrictions[]`                                                                                              |
| `BookingRequestCooks`        | Composite PK `(cookId, bookingRequestId)`; notify / open / decline; nullable `menuEvaluation`; nullable `travelDistanceKm` (Routes stamp)   |

Domain: `src/server/domain/bookingRequest.ts` (enums, payloads, status derive). Create sets `expiresAt` via `bookingRequestExpiresAt`.
`menuEvaluation` / `menuEvaluationLoading` are filled by the AI menu-evaluation job when `AI_MENU_EVALUATION` is on — see
[ai-menu-evaluation.md](./ai-menu-evaluation.md).

### GraphQL / commands

- Role-scoped `UserBookingRequest` / `CookBookingRequest` / `AdminBookingRequest`
- Cook types expose resolved `message` only (`adjustedMessage` ?? `originalMessage`); customer / admin keep the raw pair
- `publicationStatus` on `AdminBookingRequest` only (customer exposure is a Next step)
- Create: `UserMutation.bookingRequestCreate` (rejects if the caller is a cook). Discounts: `bookingRequestDiscountUpdate`, plus admin
  `AdminMutation.bookingRequestDiscountUpdate` (same apply/clear rules). `bookingRequestChurnPromoCodeCreate`. Cancel / recall:
  `bookingRequestCancel`, `bookingRequestRequestRecall`. Hydration: `userBookingRequestHydrate`
- `User.previousEventAddresses`: lean own-user list of distinct prior venues (`userPreviousEventAddressesFindMany`; newest first, capped
  at 5) for form quick-select without hydrating full `bookingRequests`
- Notify helpers: `cookIdsCanCreateOffersFind`, `bookingRequestCooksNotify`, `cookIsInTravelRadius`

### Customer surfaces

| Surface                              | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/booking-request/form`              | Wizard; URL draft sync via `bookingRequestFormSearch.ts` (flat venue params + optional `redeemCode`); venue step shows `User.previousEventAddresses` chips when signed in; after create navigates to submitted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `/booking-request/$id/submitted`     | Post-create celebration (next-steps timeline + food images under “Wie geht es weiter?”, success banner at the bottom with link to the request); loader redirects to the form when the id is missing or not owned; viewport-locked like the form                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `/profile/booking-requests`          | Owned requests (`useUserUpdatesSeed` + `userUpdates`); empty + “book again” banners                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `/profile/booking-requests/$id`      | Detail + offer preview cards first (status pill on the offers title; wraps above on mobile); full-pane width like the list (`@container` + `w-full min-w-0`); when offers exist, an info `StatusAlert` sits above the cards (review / compare / chat / call guidance with offer count); sticky tabs `overview` / `discount` / `support`; overview fact card (`rounded-xl`) with a 2-col fact grid (occasion, participants, date/time, preferences, price class as `Title (ab/from {min} p.P./p.p.)` via `bookingRequestPriceClassLabel`, full address + quiet “cooks only see: {city}” line and info popover) and, when present, the original-message preview with avatar as a 3rd column from `@xl` (stacks under the facts on narrower panes); discount lives only in its tab via `BookingRequestDiscountEditor` (redeem or remove while editable; no empty-state copy; input hidden once applied — remove first to enter another; server/`userUpdates` state only); `ProfilePinnedFooterLayout` for edit / cancel; remount `key={bookingRequestId}` |
| `/profile/booking-requests/$id/edit` | No page heading; warning `StatusAlert` about chef reconfirmation; TanStack Form; venue Combobox; `travelImpact` preview when address changes; `ProfilePinnedFooterLayout` for Cancel / Save                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Lifecycle emails: create / cook notify / request update / cancel — `src/server/utils/bookingRequestLifecycleEmails.ts`. Slack thread refs:
[slack-notifications.md](./slack-notifications.md).

### Key files

- Create form: `BookingRequestFormPage.tsx`, `BookingRequestFormStepLayout.tsx`, `SelectableChip.tsx`,
  `BookingRequestParticipantsRestrictionsEditor.tsx`, `src/web/components/base/time-picker.tsx`, `src/shared/bookingRequestFormDefaults.ts`
  (`defaultBookingRequestRestrictions`, `bookingRequestPriceClassInfo` / `bookingRequestPriceClassLabel`),
  `src/shared/bookingRequestParticipants.ts`, `src/shared/bookingRequestFormFunnel.ts` (stable funnel step ids for session events),
  `src/web/pages/bookingRequestFormSearch.ts`, `src/routes/{-$locale}/booking-request_.form.tsx`. Viewport-locked (`h-dvh`) with an inset
  scroller — document gutters off via `workspace-no-document-scroll` ([theme.md](../styles/theme.md)). Funnel instrumentation:
  [session-events.md](../architecture/session-events.md), [admin-analytics.md](./admin-analytics.md).
- Submitted: `BookingRequestSubmittedPage.tsx` (+ `.graphql`), `src/routes/{-$locale}/booking-request_.$bookingRequestId_.submitted.tsx`
  (same viewport-lock path match).
- Customer list / detail / edit: `ProfileCustomerBookingRequestsPage.tsx`, `ProfileCustomerBookingRequestPage.tsx`,
  `ProfileCustomerBookingRequestEditPage.tsx`, `CustomerBookingRequestCard.tsx`, `BookingRequestDiscountEditor.tsx`
- Architecture: [docs/architecture/booking.md](../architecture/booking.md)
- Related slices: [booking-offers.md](./booking-offers.md), [booking-payment.md](./booking-payment.md),
  [admin-booking-requests.md](./admin-booking-requests.md)
