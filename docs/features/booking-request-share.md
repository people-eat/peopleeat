# Booking request share (readonly)

Customers can share a readonly link to their booking request so family and friends can follow incoming offers and menus and help decide
which chef to book.

## Behavior

**Status:** idea only — not built.

### Problem

Private-chef bookings are often planned for a group (dinner party, birthday, family gathering). Today only the account owner sees the
request detail and the offer cards (cook, menus, price). Co-hosts and guests who care about the menu or the chef have no product path in:
the owner forwards screenshots or narrates options in a group chat. That slows decisions, drops people out of the excitement, and keeps
peopleeat’s reach limited to the one person who submitted the form.

### Target journey

1. **Owner** opens their booking request (detail or submitted page) and chooses **Share**. Copy explains the link is for family and friends
   to _see_ offers and menus, not to accept, decline, chat, pay, or edit the request.
2. peopleeat creates (or reuses) a **readonly share link** for that request. The owner copies it, or shares via the platform share sheet /
   WhatsApp / email.
3. **Recipient** opens the link (no peopleeat account required for v1). They see a calm, branded readonly view: request summary (occasion,
   date, party size, high-level preferences) and the same **offer cards** the owner uses to compare chefs (cook photo, city, tags, menu
   hint, price, lifecycle), with a path into each offer’s **menus** in readonly form.
4. Recipients can refresh as new offers arrive; the page stays live while the request is open. When the owner accepts an offer or the
   request closes (cancel / expire), the share view updates to a clear “decision made / closed” state without exposing payment or chat.
5. **Owner** can stop sharing (revoke / rotate the link) so old forwards stop working.
6. Optional later: recipients leave a lightweight preference (“favor this offer”) visible only to the owner — not required for v1.

### Roles

| Role            | What they do                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Request owner   | Creates / copies / revokes the share link; remains the only person who can negotiate, accept, or pay |
| Share recipient | Views request + offers + menus readonly; helps the group decide offline or in their own chat         |
| Cook / admin    | Unchanged — cooks still never see peer offers; admins keep full ops surfaces                         |

### What the share view shows (v1 sketch)

- Request facts the group needs to judge fit: occasion, event date/time, participant counts, dietary notes when present, soft price class /
  preferences — **not** the exact street address, invoice data, voucher codes, or support tools.
- Offer comparison cards aligned with the owner’s request detail (menus and price visible; no chat, calls, accept/decline, or checkout).
- Clear branding and a soft CTA for recipients who are not yet customers (“Plan your own private chef dinner”) so sharing also reaches new
  people — without turning the page into a hard sell.

### Out of scope for v1

- Letting recipients accept, decline, chat, call, pay, or edit the booking request.
- Requiring every recipient to create an account or sign in (invite-to-account can be a later slice).
- Showing offer chat transcripts, phone numbers, discovery-call slots, or exact venue address before dual accept.
- Letting cooks see who viewed the share link.
- Multi-owner / co-host accounts with write access (share is readonly by design).

Related journey: [booking.md](./booking.md), owner surfaces [booking-request-create.md](./booking-request-create.md), offer cards
[booking-offers.md](./booking-offers.md).

## Decisions

### Alternatives considered

| Approach                                      | Pros                                            | Cons                                                               |
| --------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| Secret readonly link (token in URL)           | Zero-friction for family; easy WhatsApp forward | Link leak = content leak until revoked                             |
| Auth-gated invites (email / account required) | Stronger access control                         | Friction kills casual “show mom the menus” use                     |
| Screenshots / manual forward only (today)     | No build                                        | Stale, incomplete, no live offer updates, weak brand reach         |
| Full co-host with write access                | True shared ownership                           | Negotiation and payment need a single decision-maker; harder abuse |
| Public request pages indexed by search        | Maximum reach                                   | Exposes private dinner plans; not appropriate for home bookings    |
| Share a single offer only                     | Narrower disclosure                             | Group decisions need the full comparison set                       |

### Chosen (provisional, for the idea)

**Owner-generated secret readonly link to the booking request’s offer board**, no account required for viewers, revocable by the owner. Show
request summary + offer cards + readonly menus; hide address, chat, calls, payment, and all write actions. Keep a light branded path for new
visitors so sharing grows awareness as well as helping the group decide.

Rationale: the product need is social decision-making and reach, not joint account administration. A link matches how groups already
coordinate (chat apps). Readonly keeps liability and Stripe/chat surfaces on the owner. Revocation and omitting the street address keep the
leak blast radius acceptable for a first slice.

## Next steps

1. Validate with hosts who already forward offer screenshots: what they want recipients to see vs hide (price? cook name? dietary list?).
2. Define link lifetime (until request closes vs explicit revoke vs TTL) and whether rotating the link invalidates all prior copies.
3. Spec the readonly page layout against the existing customer offer cards so comparison feels familiar without implying control.
4. Spec bilingual empty / closed / revoked states and the soft acquisition CTA for non-customers.
5. Feature-toggle rollout once implementation starts; measure share opens and whether shared requests convert faster or attract new
   sign-ups.
6. Decide whether v1 tracks anonymous view counts for the owner (“3 people opened your link”) — useful feedback, privacy-sensitive.

## Ideas

- **Preference votes:** recipients tap “I like this one” on an offer; owner sees a simple tally on their request detail.
- **Signed-in co-viewers:** optional upgrade so recurring co-hosts bookmark the request inside their profile without write access.
- **Share from submitted page:** primary CTA right after create, while excitement and WhatsApp forwarding are highest.
- **WhatsApp-ready preview:** Open Graph / link unfurl image that shows occasion + “X chef offers” without leaking menus in the preview.
- **Per-offer deep share:** owner shares one chef’s menus into a thread that is already debating that cook (still readonly).
- **Expiry aligned with request:** auto-disable when the request is canceled, expired, or dual-accepted and paid.

## Implementation

Not implemented. When built, keep schema, GraphQL, commands, jobs, and file paths below this line; product text above stays admin-AI safe.

Likely touchpoints (sketch only):

- Feature toggle + per-request share token (create / rotate / revoke) with a public readonly query scoped to safe fields
- Public route under `{-$locale}/` (noindex) for the share page; owner Share control on request detail / submitted
- Reuse customer offer-card and menu-readonly presentation without accept / chat / call / checkout chrome
- See [booking.md](./booking.md), [booking-request-create.md](./booking-request-create.md), [booking-offers.md](./booking-offers.md),
  [admin-feature-toggles.md](./admin-feature-toggles.md), [discovery-seo.md](../architecture/discovery-seo.md)
