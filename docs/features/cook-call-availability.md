# Cook call availability

Cooks define when they can take discovery calls and manage pending and confirmed call appointments from one profile page.

## Behavior

Signed-in cooks manage discovery-call availability on `/profile/calls`:

1. **Scheduled calls** — pending and confirmed bookings across offers at the top (customer name, time, status). Confirm or decline incoming
   requests, withdraw suggestions, cancel confirmed appointments, download calendar files, or open the offer Call tab when joinable.
2. **Enable + duration** — toggle call scheduling (AlertDialog explains enable/disable, then confirm → mutate) and pick 15 / 30 / 45 / 60
   minutes (dropdown saves immediately with a toast). No batch Save.
3. **Weekly time windows** — up to **3** recurring windows (day of week; minutes after midnight, inclusive start / exclusive end). Create,
   edit (delete + recreate), and delete apply immediately.
4. **Exceptions** — per-date block (remove availability) or open (one-off window). All-day when start/end unset. Create and delete apply
   immediately. Exceptions load from today through ~90 days ahead.

Planning, time windows, and exceptions each use base `Card`. When scheduling is off, window and exception controls are disabled. Host
booking uses slot request/confirm/decline/cancel from the offer Call tab and from this page; the Call tab schedule section links here when
scheduling is off.

Derived free slots and LiveKit join flows are documented in [booking-request-offer-calls.md](./booking-request-offer-calls.md).

## Decisions

### Alternatives considered

| Option                            | Notes                                         |
| --------------------------------- | --------------------------------------------- |
| List + exception dialogs (chosen) | Lightweight; matches cook mental model        |
| Full weekly calendar grid         | Rejected — heavier UX                         |
| Reject overlapping weekly rules   | Deferred — overlaps allowed; slot merge later |
| UI-only cap of 3 weekly rules     | Rejected — server enforces max 3              |

### Chosen

Separate weekly rules and date exceptions; immediate apply for rules/exceptions/duration; enable/disable via confirm dialog then cook
profile update. Slot derivation and call booking tables integrate with offer schedule surfaces. Weekly windows and exceptions are
minute-of-day in the cook’s `Users.timeZone` (IANA); `cookCallSlotsFindMany` → `deriveCookCallSlots` uses that zone. Viewers format concrete
slot instants in their own zone.

## Implementation

- Schema: `CookCallAvailabilityRules`, `CookCallAvailabilityExceptions`, `CookCallSlotBookings`
- Domain: exception types in `src/server/domain/cook.ts`
- Shared: `src/shared/cookCallAvailability.ts`, `src/shared/deriveCookCallSlots.ts`
- Commands: rule/exception create/delete; slot booking request/confirm/decline/cancel (offer flows)
- Queries: rules, exceptions, slot bookings, `cookCallSlotsFindMany` (look-ahead capped)
- GraphQL: rules, exceptions, slot bookings on cook (`callSlotBookings(criterion: CookCallSlotBookingCriterion)` — optional `statuses`,
  `from` / `to` on `startAt`; default PENDING+CONFIRMED with `endAt >= now` when criterion omitted); CRUD mutations
- UI: `ProfileCookCallsPage` (scheduled-call rows, planning, time windows, and exceptions use base `Card`; appointment rows use
  `StatusBadge`; enable/disable uses `AlertDialog`), rule/exception dialogs
- Tests: `src/server/commands/cookCallAvailability.test.ts`

Validation: day 0–6; minute bounds; max 3 rules; exception date `YYYY-MM-DD`; duration ∈ {15, 30, 45, 60}.

See [cook-profile.md](./cook-profile.md), [booking-request-offer-calls.md](./booking-request-offer-calls.md).
