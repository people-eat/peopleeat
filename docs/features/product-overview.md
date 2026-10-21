# Product overview

peopleeat is a private-chef booking marketplace that connects hosts with cooks who propose menus and priced offers.

## Behavior

**Target journey**

1. **Customers** describe an occasion (date, place, party size, preferences) as a booking request.
2. **Cooks** browse open requests in their travel area and submit **offers** (price; optional menus from the menu builder).
3. Customers compare offers, negotiate in chat, accept one offer jointly with the cook, pay, and attend the event.
4. After the event, both sides can leave reviews; admins curate standout quotes on city, partner, occasion, and chef surfaces.

**What is live today**

- Public marketing and content: home, about us, chef recruitment, cities, partners, occasions, blog, public chef directory, legal pages,
  gift-card purchase.
- Identity and profiles: passwordless log-on, account settings, cook vs customer profile shells, meals, menus, chef profile, call
  availability, wallet.
- **Booking path**: request form and publication rules, cook pool, offer create and dual accept, offer chat with concierge, Stripe checkout
  and cook payout, discovery calls, and admin booking operations — see [booking.md](./booking.md) and
  [admin-booking-requests.md](./admin-booking-requests.md).
- Gift cards and admin promo catalog.
- Testimonials tied to completed paid offers; public display on chefs, cities, partners, and occasions.

**Not yet**

- AI-assisted booking intake at `/booking-request/chat` remains deferred.
- QR cook arrival identity check at the host’s door — see [cook-arrival-identity-verification.md](./cook-arrival-identity-verification.md).

## Decisions

### Alternatives considered

| Approach                         | Pros                         | Cons                                    |
| -------------------------------- | ---------------------------- | --------------------------------------- |
| Build booking domain immediately | Fast visible product surface | Risks locking schema before UX is clear |
| Brand + platform first           | Stable foundation            | Product features land in follow-up PRs  |

### Chosen

Ship a stable brand, auth, and content foundation first; deliver booking and marketplace slices in dedicated releases, each documented under
`docs/features/`.

## Implementation

- Site name / SEO: `src/web/seo/seoConstants.ts`
- Theme + fonts: `src/styles.css`, `docs/styles/theme.md`, `docs/styles/fonts.md`
- Landing: full marketing home — see [landing.md](./landing.md). `HomePage` composes sticky `Header` (`overMedia`) over `SectionHero`
  (`/assets/dinner.mp4`), then experience selection, comparison, how-it-works, shared-experiences quote, static customer testimonials,
  known-from logos, shared FAQ `SectionQuestionsAndAnswers` (also on `/how-to-become-a-chef`; `FAQPage` JSON-LD), support CTA, and
  `SectionCities` (`publicCity.findMany`), with `Footer` below. `overMedia` wraps the bar in a zero-height sticky shell so it stays pinned
  without consuming layout height — `SectionHero`’s `h-dvh` still fills the viewport. Full-bleed dark media (hero, comparison scene,
  shared-experiences band, …) sets `data-over-media`; the sticky bar inverts the wordmark while any of those regions sits under the chrome,
  then switches back for contrast on light sections. Default `Header` (no `overMedia`) is sticky for light canvases (e.g. `SignInPage`).
  Footer is four columns (logo + company, discover, social, WhatsApp via `Button`) plus bottom bar (copyright, privacy / terms / imprint,
  language switcher). External URLs live in `seoConstants`. Header chrome uses `p-2 @6xl:p-4` on the header itself (tighter on compact
  widths; roomier once the center nav appears). Session actions use glassy `HeaderButton` (`h-12` text / `size-11` icons); primary **Anfrage
  senden** / **Send request** uses `HeroButton` (`h-12` `rounded-3xl` primary pill) linking to `/booking-request/form`, always visible in
  the header bar when shown (never tucked into a menu), hidden when `User.cook` is present. Center nav (`/how-to-become-a-chef`,
  `/gift-card`, `/about-us`) in a frosted pill from `@6xl` (1152px container) with `text-gray-800` — later than Footer’s `@4xl` so
  iPad-class widths keep the compact menu. Below `@6xl` the bar is wordmark + menu + booking CTA only; the three nav links plus log-on /
  profile / admin live in the right-aligned standard dropdown (`HeaderNavMenu`, before the CTA in the same action cluster as desktop session
  chrome) — wordmark stays (no squared mark swap). From `@6xl` up, session chrome returns to the bar (text log-on or profile/admin icons).
  Header / Footer / hero / sections use Tailwind **container queries** against the nearest `@container` (`body` / `ContentPageView`) —
  Footer `@4xl:`, header center nav `@6xl:`, sections `@md:` / `@lg:`. Public marketing / content shells cap at `max-w-7xl` (80rem) with
  `px-4 @lg:px-6` (list indexes, free-form section bodies, blog article hero, curated testimonials).
- Deploy topology: `.github/workflows/pipeline.yml`, `docs/infrastructure.md`
- Public route stubs (SEO + sitemap; page bodies still placeholders): `/gift-card` (purchase live), `/booking-request`, `/chef-sign-up`,
  `/imprint`, `/terms-and-conditions`, `/privacy-policy`. Content pages live: `/cities`, `/partners`, `/occasions`, `/blog-posts` (+
  `$pathName` details), `/chefs` (+ `$cookId` detail — see [public-chefs.md](./public-chefs.md)), `/about-us`, `/how-to-become-a-chef`. See
  [cities.md](./cities.md), [partners.md](./partners.md), [occasions.md](./occasions.md), [blog-posts.md](./blog-posts.md),
  [about-us.md](./about-us.md), [how-to-become-a-chef.md](./how-to-become-a-chef.md). Transactional stubs with `noindex`:
  `/booking-request/form`, `/booking-request/chat`
- Cook inventory: [cook-meals.md](./cook-meals.md), [cook-menus.md](./cook-menus.md)
