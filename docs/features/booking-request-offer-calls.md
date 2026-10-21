# Booking-request offer calls

Discovery video calls and scheduled slots on an open offer — ad-hoc LiveKit rooms plus propose / confirm / decline / cancel scheduling.

## Behavior

On an open offer (customer, cook, or admin offer page), a single **Call** tab covers live join/start and appointment scheduling:

1. **Schedule** — When the cook has call scheduling enabled, or the offer already has call bookings, either party proposes a discovery call;
   the other confirms or declines; either can cancel. The customer can pick from derived free slots over the next 14 days (including
   remaining times today; past times are omitted) **or** propose any free time (same DateTimePicker path as the cook). Either party’s
   request only rejects calendar overlaps with the cook’s other PENDING/CONFIRMED bookings, not “must match a derived slot.” (Customer/admin
   hide the schedule section until scheduling is enabled or bookings exist; cooks always see it, including the enable-hours prompt when
   scheduling is off.) When the offer is declined (customer, cook, or cook ban) every PENDING call request on that offer is auto-declined
   (no slot decline email). When the booking request expires or is canceled, PENDING slots on its offers are auto-canceled
   (`BOOKING_REQUEST_EXPIRED` / `BOOKING_REQUEST_CANCELED`). Confirmed slots are left alone on those paths.
2. **Ad-hoc call** — Either party (or admin) starts a live room on the offer; the peer sees a live banner and can join. Start/join lives at
   the top of the Call tab.
3. **Scheduled join** — For a confirmed slot, join is available from 60 minutes before start through 15 minutes after end (same top CTA).
4. **Admin** — Can create, join, and leave rooms on any offer; can decline PENDING call requests on the offer Call tab on behalf of the
   counterparty (customer or cook). Confirm / cancel / propose stay with the parties. Hub at `/admin/calls` (overview attention board +
   stats; list for full traffic including declines and cancels). Admin offer pages mirror customer/cook banners for pending/confirmed slots.
   Recording cards on the offer Call tab deep-link to `/admin/calls/$bookingRequestOfferCallRoomId` for summary / transcript review (see
   [call-recordings.md](./call-recordings.md)).

Customer and cook offer pages show pending incoming calls as a **compact header strip** above the tabs (visible without displacing the
fill-height chat grid); chat milestones include the slot time range. Unread counters clear when opening chat **or** Call.

**Add to calendar** — Confirmed slots expose a client-side calendar download on the Call tab schedule section and on cook `/profile/calls`
(stable event id per slot booking).

**Profile overviews** — Cook offer inbox cards surface pending/confirmed calls via a top-left info icon + popover (keeps grid card heights
even) and still deep-link to the Call tab. Customer booking-request list, customer request-detail offer cards, and admin request-detail
offer cards still show the call hint as inline text with date/time and the same Call deep-link (admin copy names who must act). Cooks also
see a cross-offer pending/confirmed list on `/profile/calls` (confirm, decline, cancel, calendar, offer link).

Calls are always available when LiveKit credentials are configured; cooks still control whether scheduling is enabled on their profile. No
feature toggles beyond that.

Legacy `?tab=schedule` deep links (emails, bookmarks) resolve to the Call tab.

Journey context: [booking.md](./booking.md), [booking-offers.md](./booking-offers.md).

## Decisions

### Alternatives considered

| Option                                                      | Notes                                                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Shared customer/cook slot mutations without role separation | Rejected — role-prefixed commands only                                       |
| LiveKit room-finished webhook for cleanup                   | Rejected — one webhook URL per server; multi-env uses explicit leave + sweep |
| Feature toggles for video/scheduling                        | Rejected — always on; cook owns scheduling enablement                        |
| UTC minute-of-day for availability                          | Rejected — wall clock uses the cook’s `Users.timeZone`                       |
| Separate Schedule + Call offer tabs                         | Rejected — merged into one Call tab (start/join above, appointments below)   |

### Chosen

Role-scoped mutations mirroring offer chat; shared helpers for slot derivation, token issue, and end-if-empty. Room close: leave → end if
empty and delete room; recurring sweep for stale active rooms (~90s threshold). One offer **Call** tab for live + scheduling; cook
`/profile/calls` stays the availability + cross-offer hub.

## Ideas

- Custom LiveKit controls, screenshare, keep call alive across offer tabs.
- Customer-side cross-offer calls hub (cook partial hub on `/profile/calls`; admin has `/admin/calls`).

## Implementation

### Schema

- `BookingRequestOfferCallRooms` / `BookingRequestOfferCallRoomParticipants`
- `CookCallSlotBookings.videoCallRoomId` when first room is created during a joinable confirmed slot

### Commands (role-prefixed)

- Call: `user|cook|admin` create / join / leave
- Slots: `user|cook` request / confirm / decline / cancel; `admin` decline (`onBehalfOf` counterparty only)
- Confirm cancels sibling pending rows and emits matching cancelled offer events
- Offer decline / cook ban / booking-request cancel / `booking-request-expire-notify` close PENDING slots via
  `bookingRequestOfferPendingCallSlotsClose` (decline emails suppressed; complete jobs canceled)
- Customer and cook request paths reject when the offer already has a confirmed slot; both accept any future `startAt` (duration from cook
  settings) subject to `cookCallSlotCalendarOverlapAssert`

### Hydration

User, cook, and admin offer hydrates batch-load call slot bookings onto `callBookings`.

### Jobs

- `booking-request-offer-call-slot-reminder` — queued, T-60m email to both parties
- `booking-request-offer-call-slots-complete` — queued per slot — completed / cancel stale pending past `endAt`
- `booking-request-expire-notify` — also cancels PENDING slots on expired requests (`BOOKING_REQUEST_EXPIRED`)
- `booking-request-offer-call-rooms-sweep` — recurring — non-webhook room end

### Lifecycle emails

Transactional mail for slot lifecycle (bilingual DE/EN; locale `de` at send time like other booking mail). Split audience templates; shared
body components where markup matches.

| Action   | Who is emailed          | Purpose        |
| -------- | ----------------------- | -------------- |
| Request  | Counterparty            | Slot requested |
| Confirm  | Requester               | Slot confirmed |
| Decline  | Requester               | Slot declined  |
| Cancel   | Counterparty            | Slot cancelled |
| Reminder | Both (T-60m, confirmed) | Upcoming call  |

Sends via dedicated email helpers or reminder job. Email failure does not roll back booking writes. Sibling auto-cancels when another slot
is confirmed, and pending-slot closes when an offer is declined / the request expires or is canceled, do **not** send decline/cancel mail.
CTAs deep-link to offer Call tab (`?tab=call`); email times use the recipient’s `Users.timeZone`.

### UI

- `BookingRequestOfferCallTab` (start/join + in-call panel) composes `BookingRequestOfferScheduleTab` (appointments + pick/propose) and
  optional admin recordings children; while in-call, only the LiveKit panel is shown
- Appointment rows, pick/propose panels, and start/join share compact Card density (`bookingOfferCallCardClassName` /
  `bookingOfferCallCardSectionClassName`: `gap-4 py-4` + section `px-4`)
- Pick/propose and start/join put the primary CTA in `CardFooter` (end-aligned); appointment rows keep inline action rows in `CardContent`
  (multi-state confirm/decline/cancel). Status uses `StatusBadge` tones (warning when you must act, info while waiting, success confirmed,
  error declined/canceled)
- Decline / withdraw / cancel: entry actions stay `outline`; commit buttons in the reason panel use `destructive` (Call tab schedule
  section + cook `/profile/calls`)
- Pending respond row: Confirm first in DOM, `flex-row-reverse` so Decline sits left and Confirm right (focus lands on Confirm first)
- Cook `/profile/calls` scheduled-call rows use the same `Card` + `StatusBadge` pattern
- Admin `/admin/calls` attention board rows use the same compact `Card` density (badges in `CardAction`, CTAs in `CardFooter`)
- Offer pages: tabs offer / chat / call (plus role-specific tabs); legacy `?tab=schedule` aliases to `call`
- Confirmed slots: calendar ICS download utility
- Profile overviews: `callBookingOverviewHint` — cook inbox uses info `Popover` on `CookBookingRequestOfferCard`; customer/admin cards keep
  inline hint text; `openCall` deep-links to `?tab=call`
- Cook `/profile/calls`: cross-offer pending/confirmed via cook call-slot bookings query
- Admin `/admin/calls` overview + list; room rows / attention “Open call” → `AdminCallPage`; slot-only rows → offer Call tab
- Admin offer cards use `callBookingOverviewHint(..., 'admin')` (neutral who-must-act copy)
- Admin offer Call tab: decline PENDING slots via `AdminBookingRequestOfferCallSlotDecline` (`onBehalfOf` counterparty); propose / confirm /
  cancel remain unavailable; compact recording cards link to `AdminCallPage`

### Env

`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, optional `LIVEKIT_ROOM_PREFIX` (default hostname from app URL).

Call audio + transcripts: [call-recordings.md](./call-recordings.md) (`OBJECT_STORAGE_S3_*`, Garage, separate LiveKit Egress worker).

See [cook-call-availability.md](./cook-call-availability.md), [architecture/booking.md](../architecture/booking.md).
