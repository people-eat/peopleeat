# SEO

## Context

Public-facing pages need consistent, correct metadata so search engines and social platforms can discover, index, and link them. Without a
shared building block every new page silently inherits poor defaults: a placeholder `<title>`, no description, no canonical, no Open
Graph/Twitter cards, and — critically for a bilingual site — no `hreflang` alternates. Drift across pages becomes a maintenance burden once
there are more than a few of them.

## Decision

A single `seoMeta()` helper produces the full set of meta and link tags from a small per-page input. Each page route calls it from TanStack
Router's `head()` callback. Sitemap and robots are served dynamically so the absolute URLs reflect the deployed environment.

The pieces:

| Concern             | Where                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-page meta+links | `src/web/seo/seoMeta.ts` — pure helper; tests in `seoMeta.test.ts`                                                                                       |
| Site-wide constants | `src/web/seo/seoConstants.ts` — `SITE_NAME`, `SITE_LOGO` (+ density `srcSet`), default share image (+ dimensions), OG locale map                         |
| Root-level defaults | `src/routes/__root.tsx` — fallback OG/Twitter card, theme-color, favicon / apple-touch links, and related chrome when a page omits `head()`              |
| Absolute origin     | `WEB_PAGE_URL` env var → `EnvironmentVariables.webPageUrl`; resolved on the client via `webPageUrlGet()`                                                 |
| Sitemap             | Index at `src/routes/sitemap[.]xml.ts`; static pages in `sitemap-pages[.]xml.ts` from `SITEMAP_PATHS`; shared builders in `sitemapXmlBuild.ts`           |
| Robots              | Dynamic route `src/routes/robots[.]txt.ts` + `robotsTxtBuild.ts` — query-param Disallows, AI crawler groups (see [discovery-geo.md](./discovery-geo.md)) |
| LLM index           | Dynamic route `src/routes/llms[.]txt.ts` — see [discovery-geo.md](./discovery-geo.md)                                                                    |
| Structured data     | `src/web/seo/jsonLd.ts` — `WebSite` + `Organization` (+ optional `FAQPage`); wire via `head().scripts`                                                   |

Optional structured data (JSON-LD) is available via `src/web/seo/jsonLd.ts` (`WebSite` + `Organization` with `logo`, optional `FAQPage`) —
emit from a route's `head().scripts` when needed. AI-search / GEO layers (`/llms.txt`, AI crawler policy, freshness) live in
[discovery-geo.md](./discovery-geo.md).

## Alternatives considered

1. **Static `public/sitemap.xml` and `public/robots.txt`.** The starting point. Rejected: every new page requires editing two files, sitemap
   URLs are brittle across environments (one file can't carry both prod and preview origins), and per-locale `hreflang` markup is tedious to
   maintain by hand.
2. **Walk the generated `routeTree` to build the sitemap.** Rejected: `routeTree.gen.ts` is `@ts-nocheck` and its runtime shape isn't part
   of the router's public contract — coupling to it is fragile. An explicit `SITEMAP_PATHS` list is one extra line per page and makes
   "what's indexable?" obvious.
3. **Read the request `Host` header for the absolute origin.** Rejected per the project decision: the env var is the single source of truth
   and survives prerender, tests, and proxy variation.
4. **Force an explicit `/de` prefix for the default locale.** Rejected: would require either adding `/de` as a router alias or breaking
   existing routing. The chosen scheme — bare path for `de`, `/en` prefix for English — matches how `src/routes/{-$locale}.tsx` already
   redirects.

## Consequences

- One mandatory env var (`WEB_PAGE_URL`) — see `docs/infrastructure.md`.
- Adding a new public page is two lines: a `head:` block in the route file and an entry in `src/web/seo/sitemapRoutes.ts` (served from
  `/sitemap-pages.xml`, discovered via the `/sitemap.xml` index).
- Localized pages get `hreflang` alternates and an `x-default` automatically — no per-page bookkeeping.
- `seoMeta()` **always** emits an explicit `<meta name="robots">` — `index,follow` by default, `noindex,nofollow` when `noindex: true` is
  passed. There is no implicit-default state; every public page declares its indexability.
- Pages using a default share image should also set `og:image:width` / `og:image:height` (via `seoConstants` or per-call `imageWidth` /
  `imageHeight`) so social crawlers do not guess dimensions.
- Logged-in / transactional pages set `noindex: true` on `seoMeta()` and are omitted from `SITEMAP_PATHS`. The chat route is the canonical
  example.
- The root route may emit site-wide fallbacks (OG/Twitter card, `theme-color`, etc.). Per-page `head()` overrides these for every indexable
  route, but the fallback exists for crawlers that hit a redirect, a bare 404, or a route that omits `head()` entirely.
- The helper is pure and isomorphic; client-side navigation updates the head correctly via TanStack Router's standard mechanism.

## Canonical URL strategy

Per-locale canonicals follow the routing setup:

| Locale         | Path on the site                  | Canonical                                                               |
| -------------- | --------------------------------- | ----------------------------------------------------------------------- |
| `de` (default) | `/`, `/terms-and-conditions`      | `https://example.com`, `https://example.com/terms-and-conditions`       |
| `en`           | `/en`, `/en/terms-and-conditions` | `https://example.com/en`, `https://example.com/en/terms-and-conditions` |

For each page `seoMeta()` emits one `<link rel="canonical">` and one `<link rel="alternate" hreflang="…">` per configured locale plus
`hreflang="x-default"` pointing at the default-locale URL.

## Fixed chrome routes (DB-backed document title / description)

Fixed public and chrome routes (home, cities list, partners list, occasions list, chefs, blog list, about, gift card, how-to-become-a-chef,
booking-request variants, chef sign-up, imprint / terms / privacy, sign-in, profile layout, admin layout) load **document title and meta
description** from `Query.publicWebPage.findOne(webPageKey)` in the route loader. `head()` uses `contentLocaleText(…De, …En, locale)`.
Visible H1 / in-page marketing copy stays on module consts in `src/web/pages/` — only `<title>` + meta description switch to the DB (with
defaults from `src/shared/webPage.ts` when no row exists). Keys live in `WebPageKey`; admin edits under `/admin/web-pages`. Keep
`noindex: true` where it was already set. Parameterized content pages (city / partner / occasion / blog post by path) keep entity-owned SEO,
not `publicWebPage`.

Wire by extending the page's loader GraphQL document (or adding a colocated `.graphql` + `routeLoaderGraphqlClient` when none exists), then:

```tsx
head: ({ params, loaderData }) => {
  const locale = localeFromParam(params);
  const webPage = loaderData.publicWebPage.findOne;
  return seoMeta({
    title: contentLocaleText(webPage.titleDe, webPage.titleEn, locale),
    description: contentLocaleText(webPage.descriptionDe, webPage.descriptionEn, locale),
    path: '/…',
    locale,
    webPageUrl: webPageUrlGet(),
    // noindex: true when already present
  });
};
```

## How to add SEO to a new page

1. Pick a `title` (≤ 60 chars before the ` — Project name` suffix) and a `description` (50–160 chars). For a **fixed chrome** route, add a
   `WebPageKey`, defaults in `webPageDefaults`, and load via `publicWebPage.findOne` as above. For ad-hoc / one-off pages, localize via the
   standard `{ de: '…', en: '…' }[locale]` pattern (or entity `*De` / `*En` fields).
2. In your route file, import `seoMeta`, `webPageUrlGet`, and `localeFromParam`, then add a `head:` callback to the route options (DB-backed
   example above, or hardcoded):

   ```tsx
   import { seoMeta } from '../../web/seo/seoMeta';
   import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
   import { localeFromParam } from '../../web/utils/locale';

   export const Route = createFileRoute('/{-$locale}/about')({
     head: ({ params }) => {
       const locale = localeFromParam(params);
       return seoMeta({
         title: { de: 'Über uns', en: 'About us' }[locale],
         description: {
           de: 'Wer wir sind und was wir tun.',
           en: 'Who we are and what we do.',
         }[locale],
         path: '/about',
         locale,
         webPageUrl: webPageUrlGet(),
       });
     },
     component: AboutPage,
   });
   ```

3. If the page is logged-in, transactional, or otherwise non-indexable, pass `noindex: true` to `seoMeta()` and skip step 4.
4. Add an entry to `SITEMAP_PATHS` in `src/web/seo/sitemapRoutes.ts`:

   ```ts
   { path: '/about', changefreq: 'monthly', priority: 0.5 },
   ```

5. Run `npm run check` and `npm test`. Visit `/sitemap-pages.xml` locally to confirm the new path is present and has both locale variants,
   and `/sitemap.xml` to confirm the pages child is listed in the index.

### Parameterized routes (`/foo/$id`)

Don't add parameterized paths to `SITEMAP_PATHS` — the pages sitemap can't enumerate their values at build time. If those pages should be
indexed, generate a per-row sitemap from the database in a separate route (e.g. `src/routes/sitemap-posts[.]xml.ts`,
`sitemap-chefs[.]xml.ts`) and list that child in the `/sitemap.xml` **index**. Until that exists, parameterized pages still get correct
`<head>` tags via their own `head:` callback; they just don't appear in the sitemap.

Live per-row sitemaps today: `/sitemap-cities.xml`, `/sitemap-partners.xml`, `/sitemap-occasions.xml`, `/sitemap-blog-posts.xml`,
`/sitemap-chefs.xml`. Static / chrome paths live in `/sitemap-pages.xml`. The root `/sitemap.xml` is a sitemap index pointing at those
children.

## Implementation notes

- `seoMeta()` takes `webPageUrl` as an argument (rather than reading a global). This keeps it pure and trivially testable. The route layer
  plumbs the value via `webPageUrlGet()`, an isomorphic helper that returns `EnvironmentVariables.webPageUrl` server-side and
  `window.location.origin` client-side. The client fallback only matters during client-side navigation; SSR (the version crawlers see)
  always uses the configured value.
- The OG locale tag uses BCP-47–style underscored codes (`de_DE`, `en_US`) which is what Facebook and most consumers accept. Update
  `OG_LOCALE` in `src/web/seo/seoConstants.ts` whenever a locale is added.
- Shared XML builders live in `src/web/seo/sitemapXmlBuild.ts` (`sitemapUrlsetBuild`, `sitemapIndexBuild`, `maxLastModified`). Static pages
  use `__SITE_LAST_MODIFIED__` for `lastmod`; content children use each row's `updatedAt` (or cook `createdAt`).
- The sitemap **index** lives at `/sitemap.xml`; static pages at `/sitemap-pages.xml`; robots at `/robots.txt` — all real route handlers
  (`src/routes/sitemap[.]xml.ts`, `sitemap-pages[.]xml.ts`, `robots[.]txt.ts`). Corresponding files in `public/` were removed so there's no
  precedence conflict.
- `robots.txt` emits a single `Sitemap: {WEB_PAGE_URL}/sitemap.xml` line (the index owns child discovery). It also Disallows `/api/`,
  `/server/`, and legacy booking deep-link query prefixes (`locationLatitude`, `locationLongitude`, `locationText`, `dateString`, `address`,
  `adults=`, `children=`).
- `Cache-Control: public, max-age=3600` on sitemap and robots endpoints — long enough to amortize cost, short enough that a deploy
  propagates new pages within an hour.
- Optional build-time `__SITE_LAST_MODIFIED__` (from `git log -1 --format=%cI` in `vite.config.ts`) feeds JSON-LD `dateModified` and static
  sitemap `lastmod`.

## AI-search (GEO)

Classical SEO covers crawlers that rank pages. AI-search systems that extract and cite benefit from an adjacent layer (`robots.txt` AI bot
allowlist, `/llms.txt`, JSON-LD entity / FAQ schemas, optional chat deep-links, `dateModified` freshness) documented in
[discovery-geo.md](./discovery-geo.md). When adding a new public page, mirror the SEO checklist with the AI-search one when those surfaces
exist — add a bullet to `/llms.txt` and consider whether the page warrants structured data.
