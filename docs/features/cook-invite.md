# Cook-to-cook invite

Approved cooks invite other cooks they know via a personal link; when the invitee reaches the program’s unlock milestone, the inviter earns
the frozen reward (v1: a cook platform-fee credit on their next bookings).

## Behavior

**Status:** shipped (feature-toggle entry). Commercial numbers (N bookings, fee %) remain provisional until confirmed.

### Problem

peopleeat grows the cook network through public recruitment ([how-to-become-a-chef.md](./how-to-become-a-chef.md),
[market-expansion.md](./market-expansion.md)) and ops. Trusted cooks already know other chefs who would fit the marketplace. There is no
in-product way for a cook to invite a peer, attribute the signup, or earn a transparent benefit when that peer becomes productive.

### Target journey

1. An **admin-approved** cook opens their profile and sees an **Invite chefs** surface: short pitch, personal invite link, copy / share /
   WhatsApp, remaining reward balance, and a list of people they invited with **progress** through the invitee journey.
2. They share the link. It opens `/chef-sign-up?invite=<cookId-or-code>` (and can be carried from `/how-to-become-a-chef` CTAs). The invitee
   completes cook sign-up or upgrade as today.
3. On cook create, peopleeat sets **attribution once**: `invitedByCookId` plus a **frozen JSON program snapshot** (discriminator + terms)
   that applied at that moment. Later program changes do not rewrite that promise.
4. The inviter watches each invitee move through four milestones: **registered → approved → first offer created → first event**.
5. When the invitee reaches the **unlock** milestone stored in that frozen snapshot (v1: first event), peopleeat **mints the inviter
   reward** from those frozen terms (not from today’s live config).
6. For v1’s fee-credit benefit, the inviter’s next offer creates use a reduced sticky cook platform fee for up to **N** dual-accepted paid
   bookings — see [booking.md](../architecture/booking.md).
7. Admins can see attribution and revoke an open reward when investigating abuse.

### Invitee progress (inviter-facing)

Derived from the invitee’s cook / offer state (not a separate workflow table). Show first name (or stage name) and a calm four-step track:

| Step | Milestone           | True when                                                                  |
| ---- | ------------------- | -------------------------------------------------------------------------- |
| 1    | Registered          | Invitee cook row exists with `invitedByCookId` = inviter                   |
| 2    | Approved            | `isApprovedByAdmin`                                                        |
| 3    | First offer created | Invitee has created at least one booking-request offer                     |
| 4    | First event         | Invitee’s first dual-accepted offer is paid / confirmed (`PAYED` or equiv) |

Steps are cumulative. Reward unlock for v1 aligns with step 4; the frozen JSON can point unlock at an earlier step in a future program
without a schema migration.

### Roles

| Role    | What they do                                                                                |
| ------- | ------------------------------------------------------------------------------------------- |
| Inviter | Shares link; tracks invitee progress; receives reward when unlock fires                     |
| Invitee | Signs up via link; completes profile and bookings as a normal cook; no required invitee cut |
| Admin   | Approves cooks as today; can view attribution and revoke open rewards                       |

### Earn trigger (chosen for v1 live program)

Reward unlocks when the invitee reaches **first event** (dual-accepted paid / confirmed). Signup, approval, or first offer alone do not
unlock v1. The frozen snapshot still stores which unlock was promised, so a future live program can switch to signup-only without breaking
old rows.

### Benefit (chosen for v1 live program)

**Inviter only:** half cook platform fee for the next **N** of the inviter’s dual-accepted paid bookings.

Provisional starting numbers (tunable, not marketing copy until confirmed):

- Marketplace default cook fee 18% → credited fee **9%**
- **N = 3** bookings per unlocked invite
- Soft cap on stacking so one viral inviter cannot erase platform margin

Customer-side fee is unchanged. No cash wallet bonus in v1.

### Abuse and quality gates

- Only **admin-approved** cooks may invite (UI and server).
- Self-invite blocked; invitee must not already be a cook; attribution never overwritten.
- Same-household heuristics where practical (e.g. identical email / phone already on the inviter).
- Credits never rewrite already-accepted offers.
- Admin can revoke an open credit; revoked credits do not apply to new offers.

### Expansion markets (NL / CH)

Founding chefs can be **invited and attributed now**. Fee credits that unlock on **first event** cannot fire until guest booking is live. Do
not put invite commission numbers on founding-chef marketing pages until commercial confirms — same stance as
[market-expansion.md](./market-expansion.md).

### Out of scope for v1

- Customer or partner referral programs.
- Cash / Stripe wallet bonuses.
- Changing the global 18/4 marketplace defaults.
- Publishing invite fee numbers on public recruitment pages before commercial sign-off.
- Invitee-side fee discounts (double-sided) — see Ideas.
- Shipping a signup-only unlock in the live program (supported by the JSON shape; not the v1 default).

Related: [cook-profile.md](./cook-profile.md), [how-to-become-a-chef.md](./how-to-become-a-chef.md),
[booking-payment.md](./booking-payment.md), [admin-users.md](./admin-users.md).

## Decisions

### Earn triggers considered

| Trigger                                 | Pros                                | Cons                                      |
| --------------------------------------- | ----------------------------------- | ----------------------------------------- |
| a) Invitee signs up                     | Fast dopamine                       | High abuse; empty profiles                |
| b) Invitee creates first X offers       | Signals activity                    | Easy to game; offers ≠ demand             |
| c) Invitee gets accepted / paid booking | Aligns with revenue                 | Slow; blocked in NL/CH until guest launch |
| Admin approval only                     | Quality bar without waiting for GMV | Still no revenue proof                    |
| First menu + public profile live        | Supply readiness                    | Still no booking                          |
| Multi-step ladder (signup → … → paid)   | Motivates nurture                   | Complex copy and accounting               |

### Benefits considered

| Benefit                                 | Pros                           | Cons                           |
| --------------------------------------- | ------------------------------ | ------------------------------ |
| a) Half cook fee (unbounded or vague)   | Clear, fair, keeps some margin | Needs a bound (N or time)      |
| b) No fees for next X bookings          | Strong incentive               | Highest cost; “free” messaging |
| c) No fee for X calendar days           | Simple calendar story          | Idle cooks waste the window    |
| Half fee for next X bookings (MVP)      | Balances a + b                 | Need clear “next X” copy       |
| Half fee for X days                     | Combines a + c                 | Same idle problem              |
| Cash / wallet bonus                     | Very motivating                | Tax, Stripe, ops burden        |
| Featured listing / city boost           | Cheap for platform             | Hard to value; fairness        |
| Invitee also gets first-booking fee cut | Double-sided growth            | Stacked fee erosion            |
| Credits on cook + customer fee          | Big wow                        | Confuses hosts; promo overlap  |

### Persistence considered

| Approach                                                    | Pros                                                      | Cons                                         |
| ----------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------- |
| `invitedByCookId` + two scalar columns (fee %, N)           | Easy to query                                             | New columns per program shape; unlock stuck  |
| `invitedByCookId` + frozen **JSON** program (discriminator) | History-safe; new unlock/benefit kinds without migrations | Need Zod validation + typed readers          |
| Version string only (“program v2”)                          | Tiny column                                               | Ops cannot read the deal without a changelog |
| Live global config at unlock / offer create                 | Easy to change programs                                   | Breaks promises                              |
| Separate invite table only                                  | Flexible multi-touch                                      | Heavier for one sticky inviter               |
| Inviter balance columns only                                | Fewer tables                                              | Merge rules when terms differ                |
| Inviter `CookInviteRewards` ledger + invitee JSON freeze    | Stacking + frozen terms; consumption state per unlock     | Extra table                                  |

### Chosen

**Earn (v1 live default):** unlock on invitee **first event** (dual-accepted paid). Progress UI still shows all four milestones.

**Benefit (v1 live default):** inviter gets **half cook platform fee** for the next **N** of their dual-accepted paid bookings (provisional
N = 3, 18% → 9%). Inviter-only.

**Persistence:**

1. On the **invitee** `Cooks` row: nullable `invitedByCookId` plus nullable JSON `inviteReward` (name final in impl) holding a **frozen
   program snapshot** with discriminators for unlock and benefit. No separate `inviteRewardCookFeePercent` / `inviteRewardBookingCount`
   columns.
2. On unlock: mint an **inviter** `CookInviteRewards` row that copies that JSON and adds consumption state matching the benefit kind (e.g.
   remaining booking count for fee-credit-on-bookings).
3. At inviter offer create (for fee-booking benefits): apply into sticky `platformFeePercentCook`; consume when that offer is paid.

Reject reading live global config at unlock time. Reject scalar-only freeze columns that cannot express a future signup unlock without a
migration.

### Frozen JSON shape (product contract)

Discriminated snapshot written at attribution time. Sketch (TypeScript-shaped; exact field names in Implementation when built):

```ts
type CookInviteReward = {
  unlockKind: 'SIGN_UP' | 'ADMIN_APPROVED' | 'FIRST_OFFER_CREATED' | 'FIRST_EVENT';
  benefit:
    | {
        kind: 'COOK_PLATFORM_FEE_BOOKINGS';
        platformFeePercentCook: number;
        bookingCount: number;
      }
    | {
        kind: 'COOK_PLATFORM_FEE_DAYS';
        platformFeePercentCook: number;
        dayCount: number;
      };
};
```

v1 live program writes `unlockKind: 'FIRST_EVENT'` and `benefit.kind: 'COOK_PLATFORM_FEE_BOOKINGS'`. A later live program may write
`unlockKind: 'SIGN_UP'` (or approval / first offer) without altering historical rows. Readers switch on `unlockKind` and `benefit.kind`.

## Next steps

1. Confirm commercial N and fee percent (and soft stack cap) before UI copy or marketing mentions numbers.
2. Confirm “first event” = first dual-accepted `PAYED` (vs event-day completed) with booking payment.
3. Spec bilingual progress-track copy and failure paths (invalid invite, already a cook, self-invite).
4. Feature-toggle rollout; admin attribution + revoke on user/cook detail.
5. Decide whether invite param is raw `cookId` or an opaque code (opaque preferred if links are forwarded widely).

## Ideas

- **Reward ladder:** recognition at earlier milestones, full fee credit at first event (multiple benefit mints or staged JSON).
- **Double-sided:** invitee gets a one-booking fee cut on their first event.
- **Founding-chef stacking:** NL/CH invites attributed now; unlock waits for guest launch when unlock is first-event.
- **Richer nurture:** surface “still needs a menu” without exposing private PII beyond first name / stage name.
- **Public recruitment:** optional “invited by a chef?” field on how-to-become-a-chef (same attribution).
- **Leaderboard / ops:** admin list of top inviters for market expansion pushes (not cook-facing in v1).

## Implementation

- Shared: [`src/shared/cookInviteReward.ts`](../../src/shared/cookInviteReward.ts) — discriminated freeze + live program defaults
- Schema: `Cooks.invitedByCookId`, `Cooks.inviteReward` jsonb; `CookInviteRewards`; `BookingRequestOffers.cookInviteRewardId` (migration
  `drizzle/0035_futuristic_iron_man.sql`)
- Attribution: `cookInviteAttributionResolve` on `userCookCreate` / nested `userCreate` cook (`CookCreate.inviteCookId`)
- Unlock: `cookInviteRewardUnlock` from approval, first offer create, and `PAYED` finalize (respects frozen `unlockKind`)
- Fee apply: `cookBookingRequestOfferCreate` stamps open fee-booking credit; consume on `PAYED` via `bookingRequestOfferPaymentFinalize`
- GraphQL: `Cook.invitees`, `Cook.inviteOpenFeeCreditRemainingBookings`; `AdminCook.invitedByCookId` / `inviteReward` / `inviteRewards`;
  `AdminMutation.cookInviteRewardRevoke`
- Toggle `COOK_INVITE`: entry only (sidebar + `/profile/invite`). Attribution/rewards stay on when off
- UI: [`ProfileCookInvitePage`](../../src/web/pages/profile/ProfileCookInvitePage.tsx) (hero illustration
  `public/illustrations/cook-invite.png`); chef-sign-up `?invite=`
- See [booking.md](../architecture/booking.md), [booking-payment.md](./booking-payment.md),
  [admin-feature-toggles.md](./admin-feature-toggles.md)
