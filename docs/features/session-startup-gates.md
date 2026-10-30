# Session startup gates

Exclusive root pipeline that shows at most one startup surface at a time: locale mismatch, then legal acceptance, then the cookie banner.

## Behavior

1. On every non-capture page load, one bootstrap query reads cookie settings, profile locale, and legal acceptance for the current session.
2. Only the highest-priority eligible surface opens:
   1. **Locale mismatch** — signed-in user, route locale ≠ profile locale (non-dismissible dialog). Decline keeps profile language and
      redirects via `buildLocaleHref` so search/hash survive.
   2. **Legal acceptance** — signed-in user must accept latest privacy/terms; suppressed on public privacy/terms pages so “Read full text”
      works.
   3. **Cookie banner** — undecided consent, or footer “Cookie settings” reopen; same bottom banner as before (not a dialog).
3. Resolving a gate reloads the bootstrap query so the next eligible surface can appear.
4. Analytics scripts still follow stored cookie settings independently of which gate is visible.
5. Browser-capture routes (`/server/*`) skip the cookie shell (banner, analytics, footer reopen); locale and legal gates still run when
   eligible.

## Decisions

### Alternatives considered

| Option                                        | Why not                                                      |
| --------------------------------------------- | ------------------------------------------------------------ |
| Three independent root queries                | Triple network work; locale + legal dialogs could stack      |
| Server `nextGate` enum                        | Order is a product/UI rule; eligibility fields already exist |
| Turn cookie into a modal in the same queue UI | Product keeps the bottom banner visual                       |

### Chosen

One client bootstrap query plus a client priority queue (`locale → legal → cookie`). Gate dialogs stay presentational; the orchestrator owns
open state.

## Next steps

## Ideas

## Implementation

| Area         | Path                                                              |
| ------------ | ----------------------------------------------------------------- |
| Orchestrator | `src/web/components/SessionStartupGates.tsx` (+ `.graphql`)       |
| Locale UI    | `src/web/components/LocaleMismatchGate.tsx`                       |
| Legal UI     | `src/web/components/LegalAcceptanceGate.tsx`                      |
| Cookie UI    | `src/web/components/CookieBanner.tsx`, `CookieConsentContext.tsx` |
| Mount        | `src/routes/__root.tsx` under `GraphQLClientProvider`             |

See [cookie-consent.md](./cookie-consent.md), [admin-legal.md](./admin-legal.md), [i18n.md](../architecture/i18n.md).
