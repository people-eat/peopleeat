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

| Layer                | Where (when adopted)                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Explicit bot policy  | `src/routes/robots[.]txt.ts` — major AI crawlers enumerated with `Allow: /`                 |
| LLM-native index     | `src/routes/llms[.]txt.ts` — markdown summary at `/llms.txt` per the `llmstxt.org` proposal |
| Entity grounding     | `src/web/seo/jsonLd.ts` — `WebSite` + `Organization` (+ optional `FAQPage`)                 |
| Verbatim Q&A         | Visible FAQ block mirrored into `FAQPage` JSON-LD via `jsonLdFaqPage()`                     |
| Freshness signal     | Build-injected `__SITE_LAST_MODIFIED__` (git commit ISO) → `dateModified` on JSON-LD        |
| Conversational entry | Optional deep-link (e.g. `?ask=…`) that opens a chat surface preseeded                      |

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

The template ships a placeholder summary and bullets derived from `SITEMAP_PATHS` — replace the copy with product facts when forking. Keep
the builder in sync with `SITEMAP_PATHS` whenever a new public page lands. Resource bullets: `[title](url): one-sentence description.`

## Structured data & FAQ

- Prefer schema.org types that match the page (`WebSite`, `Organization`, `FAQPage`, later `Article` / `Person` if the product is a person).
- Builders live in `src/web/seo/jsonLd.ts`: `jsonLdScripts(webPageUrl)` emits `WebSite` + `Organization`; `jsonLdFaqPage(entries)` emits
  `FAQPage`. Wire them from a route's `head().scripts` when the page should expose structured data.
- Carry `dateModified` from `__SITE_LAST_MODIFIED__` (declared in `src/vite-env.d.ts`, injected by Vite).
- FAQ answers must stand alone (1–3 factual sentences). Avoid marketing prose; engines extract verbatim.
- Schema content must match visible content.

## Maintenance

- New AI bot announced → add to the robots user-agent list.
- New public page → add a bullet to `/llms.txt` (mirror the sitemap change) and consider whether the page warrants structured data.
- Identity / offering facts change → update the single content module those schemas read from.
