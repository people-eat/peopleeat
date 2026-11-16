# Session startup gates

Exclusive root pipeline that shows at most one startup surface at a time: locale mismatch, then legal acceptance, then the cookie banner.

## Behavior

1. On every non-capture page load, one bootstrap query reads cookie settings, profile locale, and legal acceptance for the current session.
2. Only the highest-priority eligible surface opens:
   1. **Locale mismatch** — signed-in user, route locale ≠ profile locale (non-dismissible dialog). Confirm updates `Users.locale`
      (locale-only `userUpdate`, allowed even while legal acceptance is pending). Decline keeps profile language and redirects via
      `buildLocaleHref` so search/hash survive. Locale stays first so the legal dialog can appear in the language the user just confirmed.
      Suppressed during admin Sign in as so the operator is not asked to change the target user’s language.
   2. **Legal acceptance** — signed-in user must accept latest privacy/terms; suppressed on public privacy/terms pages so “Read full text”
      works, and suppressed entirely during admin Sign in as (`Session.impersonation`) so the operator is not asked to accept on the target
      user’s behalf. This dialog is the **cold-load** path (session already bound when the bootstrap query runs). In-page sign-in (OTP /
      Google / passkey on the booking form, plan, gift-card, log-on, chef sign-up) is handled by `AuthIdentityGate` instead: `legalPending`
      shows the same copy inline and delays `onReady` until `userLegalAccept` succeeds, so marketplace mutations are not fired while
      acceptance is stale. The bootstrap query is not refetched on bind, so this root dialog does not stack on those flows.
   3. **Cookie banner** — undecided consent, or footer “Cookie settings” reopen; same bottom banner as before (not a dialog).
3. Resolving a gate reloads the bootstrap query so the next eligible surface can appear.
4. Analytics scripts still follow stored cookie settings independently of which gate is visible.
5. Browser-capture routes (`/server/*`) skip the cookie shell (banner, analytics, footer reopen); locale and legal gates still run when
   eligible.

## Decisions

### Alternatives considered

| Option                                        | Why not                                                                                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three independent root queries                | Triple network work; locale + legal dialogs could stack                                                                                                                                           |
| Server `nextGate` enum                        | Order is a product/UI rule; eligibility fields already exist                                                                                                                                      |
| Turn cookie into a modal in the same queue UI | Product keeps the bottom banner visual                                                                                                                                                            |
| Legal before locale                           | Terms would show in the unconfirmed route language. The deadlock was `userUpdate` blocked by the legal hard-gate, not the queue order. Locale-only `userUpdate` is allowed while pending instead. |

### Chosen

One client bootstrap query plus a client priority queue (`locale → legal → cookie`). Gate dialogs stay presentational; the orchestrator owns
open state.

## Next steps

## Ideas

## Implementation

| Area         | Path                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Orchestrator | `src/web/components/SessionStartupGates.tsx` (+ `.graphql`)                                                             |
| Locale UI    | `src/web/components/LocaleMismatchGate.tsx`                                                                             |
| Legal UI     | `LegalAcceptanceGate.tsx` (dialog) + `LegalAcceptancePanel.tsx`; in-page sign-in uses the panel from `AuthIdentityGate` |
| Cookie UI    | `src/web/components/CookieBanner.tsx`, `CookieConsentContext.tsx`                                                       |
| Mount        | `src/web/components/RootDocument.tsx` under `I18nProvider` (`common`) and `GraphQLClientProvider`                       |

See [cookie-consent.md](./cookie-consent.md), [admin-legal.md](./admin-legal.md), [i18n.md](../architecture/i18n.md).
