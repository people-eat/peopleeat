# Market expansion (Netherlands and Switzerland)

Chef-first launch pages for the Netherlands and Switzerland: cooks can join now, hosts book from early 2027.

## Behavior

peopleeat is live for hosts in Germany. For the Netherlands and Switzerland the public story is: **cooks first, customers later**.

Visitors open four indexable pages (German unprefixed, English under `/en`):

1. `/coming-to/netherlands` and `/coming-to/switzerland`: **peopleeat is coming to [country]**. The first screen says chefs can join now,
   hosts cannot book yet, and guest launch is early 2027. Key cities are listed as headings. A short timeline is join, onboarding, then
   guest launch. The CTA goes to the country founding-chef page.
2. `/how-to-become-a-chef/netherlands` and `/how-to-become-a-chef/switzerland`: **become a founding chef**. Same recruitment stack as the
   Germany chef page, with founding benefits and a last onboarding step that does **not** promise guest requests until early 2027. The CTA
   opens `/chef-sign-up?market=netherlands` (or `switzerland`).

Key cities on the coming-to / founding-chef pages come from the `Cities` table filtered by `countryCode` (`NL` / `CH`). Unpublished drafts
are included so the hubs can name cities before guest launch; city detail URLs stay unpublished until then. Catalog fallbacks under
`comingTo.markets.*.city.*` remain for SEO/FAQ when no rows exist yet:

- Netherlands: Amsterdam, Rotterdam, The Hague (Den Haag / La Haye), Utrecht, Eindhoven
- Switzerland: Zurich, Geneva, Basel, Bern, Lausanne (localized in catalogs)

Admins create **unpublished** `Cities` drafts with `countryCode` `NL` or `CH` (founding-chef assignment, copy, map center) and publish them
only at guest launch together with lifting the booking guard. Country is a field on each city, not a Countries CMS — see
[cities.md](./cities.md).

Expectation rules:

- A host cannot send a booking request for an address in the Netherlands or Switzerland. The booking form and plan funnel show a notice and
  a link to the coming-to page. The server rejects create and address-update for those countries.
- A chef **can** register now, complete a profile and a first menu, and wait for guest demand in early 2027.
- Early-registration benefits on the pages are operational: ready at launch, first in the local network, featured on the first city pages,
  direct onboarding. The pages do not name a commission discount.
- Header nav stays Germany-live. Footer company links and the global `/how-to-become-a-chef` page point to the new markets.

Chef sign-up with `?market=` shows a founding-chef banner and biases address search to that country so Amsterdam or Zurich is easier to
pick.

## Decisions

### Alternatives considered

| Option                                            | Outcome                                                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Publish NL/CH city pages for hosts now            | Rejected: empty chef lists would invite customers before supply exists                          |
| Email-only interest form instead of chef sign-up  | Rejected: founding chefs should complete profile and menu now                                   |
| Two city chef pages per country, no country hub   | Rejected: would miss “peopleeat Netherlands / Switzerland” queries                              |
| Reserve `/netherlands` as the coming-to URL       | Rejected: keep short country URLs for the 2027 customer hub                                     |
| Add Dutch as a locale                             | Done: `nl` is a catalog locale (UI + email). CH pages still use German CMS copy as the default  |
| Countries CMS table like cities                   | Rejected: country hubs stay in expansion config; cities carry `countryCode` only                |
| Geo-filter `/cities` or homepage by IP / language | Rejected: unstable HTML per URL; crawlers would index the DE view                               |
| Invent a founding-chef fee discount               | Rejected until a commercial term is confirmed                                                   |
| Feature-toggle the pages                          | Rejected: they are meant to be indexed; unpublished city pages remain the pre-launch tool later |

### Chosen

Four chef-first URLs from a shared market config. Coming-to pages manage expectation. Founding-chef pages convert. Booking-request publish
for NL/CH is blocked until guest launch. Published city pages, extra locales, and CHF stay out of this phase. Homepage and `/cities` already
surface country grouping / hub links so crawlable HTML stays stable before NL/CH city publish.

## Next steps

- Confirm any founding-chef fee or commission term before putting a number on the pages.
- Before guest launch: publish NL/CH city pages (unique copy per city), 301 coming-to → `/netherlands` / `/switzerland`, lift the NL/CH
  booking notice, legal review, CHF for Swiss payouts if needed. Keep Search Console international targeting unset on the multi-country
  domain.
- Optional later: stronger NL SEO using Dutch CMS / city copy (UI catalogs already include `nl`); French/Italian for CH.
- Cook-to-cook invites ([cook-invite.md](./cook-invite.md)) may attribute founding chefs now; fee credits stay locked until guest bookings
  exist. Do not invent invite commission copy on these pages until commercial confirms (same rule as founding-chef fee discounts).

## Implementation

- Config: [`src/shared/expansionMarkets.ts`](../../src/shared/expansionMarkets.ts) — locative / motion phrases come from
  `public.comingTo.markets.*`; hardcoded city labels are FAQ/SEO fallback only (do not inject `inCountryEn` / `comingToPhraseEn` into
  non-English UI)
- Cities list: `publicCity.findMany(countryCode:)` on [`ExpansionCountryPage.graphql`](../../src/web/pages/ExpansionCountryPage.graphql) →
  [`SectionComingToCountryCities`](../../src/web/sections/SectionComingToCountryCities.tsx) (NL/CH include unpublished drafts)
- Flags: `public/countries/flag-netherlands.png`, `flag-switzerland.png` (badges) and `flag-*-peopleeat.png` (hero / card marks)
- Pages: [`ComingToCountryPage.tsx`](../../src/web/pages/ComingToCountryPage.tsx),
  [`FoundingChefCountryPage.tsx`](../../src/web/pages/FoundingChefCountryPage.tsx)
- Routes: [`coming-to_.$country.tsx`](../../src/routes/{-$locale}/coming-to_.$country.tsx),
  [`how-to-become-a-chef_.$country.tsx`](../../src/routes/{-$locale}/how-to-become-a-chef_.$country.tsx)
- SEO: market-config titles (not admin `WebPage` chrome); `COMING_TO` / `FOUNDING_CHEF` visit keys; sitemap + `llms.txt` blurbs; FAQ +
  country `Service` JSON-LD (cities from DB when present)
- Booking guard: `bookingRequestMarketClosedAssert` in `userBookingRequestCreate` and `userBookingRequestUpdate`
- Places: optional `regionCode` on `locationSuggestions` (default `DE`)
- City taxonomy: `Cities.countryCode` + `src/shared/cityCountryCode.ts` (hub paths still point at `/coming-to/…` until short country URLs
  ship) — [cities.md](./cities.md)
