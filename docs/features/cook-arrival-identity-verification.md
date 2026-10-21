# Cook arrival identity verification

At the door on event day, the host can confirm that the person arriving is the booked cook for that booking, via a short-lived QR check tied
to the paid offer.

## Behavior

**Status:** idea only — not built.

### Problem

Private-chef bookings happen in the customer’s home. After chat, calls, and payment, the host still meets a stranger at the door. A photo on
the chef profile helps, but it is easy to mistake faces under stress, and it does not prove that _this_ arrival is bound to _this_ paid
booking. The marketplace needs a clear, low-friction “yes, this is your cook for tonight” moment before the cook enters.

### Target journey

1. **After payment** (or €0 confirm), both customer and cook can open an **arrival check** surface on the accepted offer (customer booking
   detail / offer page; cook offer page). Copy explains it is for the door, not for negotiation.
2. **Near event time** (e.g. from a few hours before until a short window after planned start), the **customer** shows a **host QR** on
   their phone (full-screen, high contrast, works offline once loaded). The code is bound to that booking/offer and expires or rotates so
   screenshots go stale.
3. **Cook** opens the same booking’s arrival check, uses the device camera (or a paste-fallback for the short code under the QR), and
   **scans the host QR**.
4. On a valid scan, both sides see a clear success state: cook name + photo, booking occasion / time / address summary, and “verified for
   this booking.” The cook’s confirmation is the host’s signal that it is safe to open the door.
5. A failed or expired scan shows a calm, bilingual failure (wrong booking, expired, already used, offline) with a path to support — never a
   raw error string.
6. **Optional ops trail:** admin can see that an arrival check succeeded (timestamp + who scanned) on the booking/offer for dispute and
   safety review. No need for a live admin queue in v1.

### Roles

| Role     | What they do                                                                 |
| -------- | ---------------------------------------------------------------------------- |
| Customer | Shows host QR; reads success / failure; contacts support if the check fails  |
| Cook     | Scans host QR at the door; sees the same success confirmation                |
| Admin    | Reads check outcome on the booking when investigating issues (v1: read-only) |

### Out of scope for v1

- Government ID / KYC at the door (Stripe Connect identity stays on wallet onboarding).
- Replacing profile photos or discovery calls.
- Mandatory check before payout (may be a later policy decision).
- Geofencing or forcing the cook to be at the address (QR proves booking binding, not GPS).

Related journey: [booking.md](./booking.md), payment confirm [booking-payment.md](./booking-payment.md), cook public identity
[public-chefs.md](./public-chefs.md) / [cook-profile.md](./cook-profile.md).

## Decisions

### Alternatives considered

| Approach                                   | Pros                                          | Cons                                                               |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------ |
| Customer shows QR; cook scans (host QR)    | Host controls the check; cook proves presence | Cook needs camera + signed-in app at the door                      |
| Cook shows QR; customer scans (cook QR)    | Familiar “badge” mental model                 | Host must trust a QR the cook could reuse or screenshot elsewhere  |
| Shared short PIN / numeric code only       | Works without camera                          | Easy to forward; weaker binding to the device session              |
| Static booking QR forever                  | Simple                                        | Screenshots and leaks stay valid                                   |
| Photo match / face recognition at the door | Strong biometric signal                       | Heavy UX, privacy, false rejects; wrong tool for marketplace trust |
| Manual “I’m here” button without challenge | Minimal build                                 | No cryptographic or token binding to the booking                   |
| Require check before cook payout           | Strong compliance lever                       | Punishes good events when phones die; needs policy + exceptions    |

### Chosen (provisional, for the idea)

**Customer shows a short-lived host QR; cook scans it while signed in as the booked cook.** Success is mutual and booking-scoped. Prefer
rotating or short TTL tokens over a permanent QR. Keep a human-readable backup code under the QR for camera failures. Do not gate payout on
the check in v1.

Rationale: the host is the one deciding whether to open the door; the cook is the party who must prove they are the accepted cook for that
offer. Binding the scan to the cook’s authenticated session stops a random person with a stolen screenshot of a cook badge from passing.

## Next steps

1. Validate the door UX with a few hosts and cooks (camera permissions, dark hallway, one-handed phone).
2. Define the time window (when QR becomes available / expires) relative to event start and late arrivals.
3. Decide single-use vs reusable within the window (reusable is kinder to flaky cameras; single-use is stricter against replay).
4. Spec bilingual copy and failure paths, including “wrong cook scanned” and “cook not the accepted offer.”
5. Feature-toggle rollout (similar to other booking slices) once implementation starts.
6. Optionally notify the other party (push / email / in-app) when a check succeeds — nice-to-have, not required for the door moment.

## Ideas

- **Cook QR fallback:** if the host cannot show a QR, allow the reverse direction with a cook-presented code that the host confirms against
  the expected cook name/photo (weaker; document as secondary).
- **Watch / tablet mode:** large host QR for wall tablets or a printed sheet for the evening (with the same TTL / rotation rules).
- **Concierge assist:** support or concierge can mark “identity confirmed out of band” when phones fail, with an audit reason.
- **Pre-arrival reminder:** evening-before email/WhatsApp with “how arrival check works” so nobody discovers it at the door.
- **Soft prompt after success:** one-tap “Cook arrived” milestone on the offer timeline for ops and post-event flows.
- **Insurance / safety partner:** export anonymized check rates; not a product surface until there is a real partner need.

## Implementation

Not implemented. When built, keep schema, GraphQL, commands, jobs, and file paths below this line; product text above stays admin-AI safe.

Likely touchpoints (sketch only):

- Feature toggle + booking/offer-scoped token (create / rotate / consume) with cook-session guard on scan
- Customer + cook arrival surfaces on existing offer routes; camera via platform APIs or a small scan component
- Admin read model on booking/offer detail for check timestamp / result
- See [booking.md](./booking.md), [admin-feature-toggles.md](./admin-feature-toggles.md),
  [authentication.md](../architecture/authentication.md)
