# AI-search optimization (GEO)

## Context

Classical SEO optimizes for search engines that crawl, index, and rank pages. AI-search ("generative engine optimization", GEO) optimizes
for systems that crawl, extract, and **cite** — Perplexity, ChatGPT Search, Google AI Overviews, Claude, You.com, and the like. They reward
different signals than classical rankers: machine-readable summaries beat keyword density, discrete Q&A blocks beat long prose, fresh
timestamps beat hand-curated PageRank, and explicit bot policies beat implicit allows.

Public products that want correct citations — identity, offerings, contact channels, key pages — benefit from treating AI crawlers as a
first-class discovery audience alongside classical SEO. See [discovery-seo.md](./discovery-seo.md) for the shared meta / sitemap / robots
building blocks; this ADR covers the AI-search layer that sits beside them.

## Decision

Five optional layers cooperate. Each is small; together they cover the surface AI engines actually look at. A fork adopts the layers it
needs — none are mandatory on day one of a blank template clone.

| Layer                | Where (when adopted)                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Explicit bot policy  | `src/routes/robots[.]txt.ts` — major AI crawlers enumerated with `Allow: /`                                                 |
| LLM-native index     | `src/routes/llms[.]txt.ts` — markdown summary at `/llms.txt` per the `llmstxt.org` proposal                                 |
| Entity grounding     | `src/web/seo/jsonLd.ts` — `WebSite` + `Organization`, chef `LocalBusiness`, city `Product`, `BlogPosting`, `BreadcrumbList` |
| Verbatim Q&A         | Visible FAQ block mirrored into `FAQPage` JSON-LD via `jsonLdFaqPage()`                                                     |
| Freshness signal     | Build-injected `__SITE_LAST_MODIFIED__` (git commit ISO) → `dateModified` on JSON-LD                                        |
| Conversational entry | Optional deep-link (e.g. `?ask=…`) that opens a chat surface preseeded                                                      |

## Alternatives considered

1. **Block all AI crawlers.** Strongest privacy stance; often wrong for a deliberately public product surface.
2. **Allow only inference crawlers and block training crawlers.** Plausible ("cite me but don't memorize me"), but the line between training
   and inference blurs every quarter, and public content is usually already mirrored elsewhere.
3. **Static `public/llms.txt`.** Rejected for the same reason `sitemap.xml` and `robots.txt` are dynamic routes: absolute URLs need
   `WEB_PAGE_URL`, and one handler beats two files that drift.
4. **Stuff FAQ answers into a shared identity module.** Tempting for DRY. Prefer keeping page-specific Q&A next to the page that renders it;
   JSON-LD should read from the same `buildFaq()` (or equivalent) so schema and DOM cannot drift.

## Consequences

- AI crawlers see explicit consent, which matters for bots that respect a denylist by default.
- `/llms.txt` gives engines an authoritative content map without scraping rendered HTML.
- JSON-LD `dateModified` from the last git commit keeps pages from looking stale after deploys that change content.
- Visible FAQ and `FAQPage` JSON-LD from one function avoid structured-data mismatch penalties.
- Optional chat deep-links make conversational entry a citable target when a public assistant exists.
- Build dependency on `git` at build time when freshness is wired; fall back to the current date outside a worktree.

## Bot policy

When adopted, `robots.txt` enumerates AI crawlers explicitly. Typical allow-list entries (same `Disallow` rules as `*`):

| Bot                 | Operator     | Purpose                            |
| ------------------- | ------------ | ---------------------------------- |
| `GPTBot`            | OpenAI       | Training corpus crawl              |
| `OAI-SearchBot`     | OpenAI       | ChatGPT Search live-citation fetch |
| `ChatGPT-User`      | OpenAI       | Per-conversation fetch             |
| `ClaudeBot`         | Anthropic    | Training + inference               |
| `anthropic-ai`      | Anthropic    | Legacy umbrella UA                 |
| `PerplexityBot`     | Perplexity   | Index + citation                   |
| `Perplexity-User`   | Perplexity   | Per-query browse fetch             |
| `Google-Extended`   | Google       | Gemini training opt-in             |
| `Applebot-Extended` | Apple        | Apple Intelligence training opt-in |
| `CCBot`             | Common Crawl | Open dataset feeding most LLMs     |
| `cohere-ai`         | Cohere       | Training                           |

Disallow private / API / capture paths uniformly (`/api/`, `/server/`), plus legacy booking deep-link query prefixes (`/*?locationLatitude`,
`/*?locationLongitude`, `/*?locationText`, `/*?dateString`, `/*?address`, `/*?adults=`, `/*?children=`). Forks with authenticated admin UI
paths should add those to the same `Disallow` block. Adding a new AI agent is a one-line edit in `AI_USER_AGENTS` (see
`src/web/seo/robotsTxtBuild.ts`). Emit a single `Sitemap:` line pointing at the `/sitemap.xml` index.

To switch to "block training, allow citation" later, split into inference vs training arrays and emit `Disallow: /` for the training group.

## llms.txt

Lives at `/llms.txt` (`src/routes/llms[.]txt.ts`). Format follows the `llmstxt.org` proposal (markdown, H1 = site name from `SITE_NAME`,
blockquote summary, H2 sections of bulleted resource links). English-only is fine — the consumer is an LLM; linked pages cover locales via
`hreflang`.

`src/web/seo/llmsTxtBuild.ts` writes the file. Static pages use a hand-written English sentence per `SITEMAP_PATHS` entry (a test fails when
a path has no sentence). Cities, occasions, articles, and public chefs are one bullet each, the same rows as the content sitemaps, with
English copy and `/en` URLs. Resource bullets: `[title](url): one-sentence description.`

Lighthouse's Agentic Browsing audit fetches `/llms.txt` with a **hard 2s timeout**. A valid file that regenerates slowly from the database
fails as "Timed out fetching resource" even when the markdown is correct. The route therefore keeps a 1h process-memory cache of the built
body (aligned with `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`) and loads chef bullets via a lean
`publicCookLlmsEntriesFindMany` query (listed cooks only; no public-list ranking EXISTS). Static `public/llms.txt` stays rejected: absolute
URLs still need `WEB_PAGE_URL`.

## Structured data & FAQ

- Prefer schema.org types that match the page (`WebSite`, `Organization`, `FAQPage`, `LocalBusiness`, `Product`, `Service`, `BlogPosting`,
  `BreadcrumbList`).
- Builders live in `src/web/seo/jsonLd.ts`. `jsonLdScripts(webPageUrl)` emits `WebSite` + `Organization` (legal name, Frankfurt postal
  address, contact email, Instagram / Facebook / LinkedIn `sameAs`). `jsonLdFaqPage(entries)` emits `FAQPage`. `jsonLdLocalBusiness` is the
  public chef, with `aggregateRating` when published reviews are visible (Google-eligible parent; do not use `Person` for ratings).
  `jsonLdCityProduct` is a city landing with curated ratings (`Product` + required `aggregateRating`); without ratings use
  `jsonLdCityService` (`Service` + `GeoCoordinates` from the stored center). `jsonLdBlogPosting` is an article, dated from `publishedAt` /
  `updatedAt`. `jsonLdBreadcrumbList` mirrors the header logo and the page's index link. Wire them from a route's `head().scripts`.
  Canonical URLs come from `canonicalUrlBuild` in `seoMeta.ts`.
- Carry `dateModified` from `__SITE_LAST_MODIFIED__` (declared in `src/vite-env.d.ts`, injected by Vite).
- FAQ answers must stand alone (1–3 factual sentences). Avoid marketing prose; engines extract verbatim.
- Schema content must match visible content.

## Maintenance

- New AI bot announced → add to the robots user-agent list.
- New public page → add an English sentence to `LLMS_PAGE_BLURBS` (the sitemap test covers the key) and consider whether the page warrants
  structured data.
- Identity / offering facts change → update the single content module those schemas read from.
