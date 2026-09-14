# Route errors

When a route loader or render fails, visitors see a calm bilingual error page instead of TanStack Router’s default technical error box.

## Behavior

1. A failed route (loader throw, render throw, GraphQL loader failure such as HTTP 502) shows a full-page message: title, one short
   sentence, **Try again**, and **Back to home**.
2. Copy is bilingual (DE / EN) and never shows the raw error message, status codes, or stack traces.
3. **Try again** resets the route error boundary and re-runs loaders (`reset` + `router.invalidate()`).
4. **Back to home** goes to `/` or `/en` for the active locale.
5. The technical error is logged to the browser console for local debugging only.

Unmatched URLs and loader-thrown `notFound()` use `RouteNotFound` (`notFoundComponent` on `__root`, plus router `defaultNotFoundComponent`).
Prefer throwing `notFound()` from the **route loader** when the seed query already proves absence — that sets `match.status = 'notFound'`
and avoids the per-route error CatchBoundary.

Component-thrown `notFound()` (e.g. after a live subscription flips to not-found) is still caught by `defaultErrorComponent` before the root
404 boundary, so `RouteError` detects `isNotFound` and renders the same `RouteNotFound` UI.

## Decisions

### Alternatives considered

| Option                                    | Why not                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| Keep TanStack’s built-in `ErrorComponent` | Surfaces transport text (“GraphQL request failed with status 502”)      |
| Show `error.message` in development only  | Easy to leak into builds; console logging is enough for local debugging |
| Separate admin vs public error UIs        | One calm fallback is enough; shells still wrap the same page            |

### Chosen

One shared `RouteError` as the router `defaultErrorComponent` and the root `errorComponent`, matching the 404 layout language and bilingual
copy rules.

## Implementation

| Area         | Path                                          |
| ------------ | --------------------------------------------- |
| Error UI     | `src/web/components/RouteError.tsx`           |
| 404 UI       | `src/web/components/RouteNotFound.tsx`        |
| Router error | `src/router.tsx` → `defaultErrorComponent`    |
| Router 404   | `src/router.tsx` → `defaultNotFoundComponent` |
| Root error   | `src/routes/__root.tsx` → `errorComponent`    |
| Root 404     | `src/routes/__root.tsx` → `notFoundComponent` |

TanStack Start uses TanStack Router route-level error boundaries. Omitting `defaultErrorComponent` falls back to the built-in
`ErrorComponent` (the red “Something went wrong!” / “Hide Error” UI).
