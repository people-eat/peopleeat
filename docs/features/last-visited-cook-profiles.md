# Last visited cook profiles

Visitors see the last chef profiles they opened this session as a card strip at the bottom of public chef and blog post pages.

## Behavior

When `LAST_VISITED_COOK_PROFILES` is on (missing DB row = off):

1. Opening a public chef profile (`/chefs/…`) records a session page visit as usual.
2. On the next chef or blog post page load, a **Recently viewed** / **Zuletzt angesehen** band near the footer shows up to **four** unique
   chefs from that history, newest first, using the same public chef cards as `/chefs`.
3. On a chef page, the cook currently shown is omitted from the strip (so the band only suggests other chefs).
4. Chefs who are no longer publicly listed are dropped silently.
5. When the visitor has no prior chef-profile visits (or none left after filters), the band is hidden.

The strip is session-scoped (same sticky browser session). It does not sync across devices or merge into the signed-in user. City pages are
out of scope.

## Decisions

### Alternatives considered

| Option                                        | Notes                                                     |
| --------------------------------------------- | --------------------------------------------------------- |
| Persist a Session JSON MRU list on each visit | Extra write path and migration surface for a tiny UI list |
| Derive from SessionEvents (chosen)            | Reuses visits already emitted for analytics               |
| localStorage                                  | Weak SSR fit; diverges from the server session model      |
| Also show on city pages                       | Deferred; city pages already have curated featured cooks  |

### Chosen

Read the last unique `CHEFS` profile visits from `SessionEvents` for the current session, hydrate public cook cards, and gate the product
with `LAST_VISITED_COOK_PROFILES`. Page queries request the field with `@include(if: $includeLastVisitedCookProfiles)` so clients can skip
the selection when they know the toggle is off; the server still returns an empty list when the toggle is off.

## Implementation

- Feature toggle: `LAST_VISITED_COOK_PROFILES` in `src/shared/featureToggle.ts` + GraphQL `FeatureToggleKey`; admin labels in
  `src/web/pages/admin/adminFeatureToggles.ts`
- GraphQL: `Session.lastVisitedCookProfiles(excludeCookId: ID): [PublicCook!]!`
- Query: `src/server/queries/sessionLastVisitedCookProfilesFindMany.ts` (newest-first scan, dedupe, listed filter via
  `publicCookListedWhere`, hydrate via `publicCooksByIdFindMany`)
- Resolver: `Session.lastVisitedCookProfiles` in `src/server/graphql/resolversCreate.ts` checks `featureToggleIsEnabled` before querying
- Index: `SessionEvents_webPageVisit_chefs_sessionId_createdAt_idx` partial index on chef detail visits by session (see
  [session-events.md](../architecture/session-events.md))
- UI: `SectionLastVisitedCooks`; wired on `ChefPage` and `BlogPostPage` (`ContentPageView.lastVisitedCooks`); loaders pass
  `includeLastVisitedCookProfiles: true`
- Visit source: existing `SessionWebPageVisitTracker` → `sessionWebPageVisitCreate` (`WEB_PAGE_VISITED` / `CHEFS` / resolved `cookId`)
