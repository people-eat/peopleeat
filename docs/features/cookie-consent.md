# Cookie consent

A bottom banner records analytics consent per browser session before loading Google Analytics or Microsoft Clarity.

## Behavior

1. On first visit with no stored choice, a fixed bottom banner asks for cookie consent (not dismissible until a choice is made).
2. **Accept all** enables Google Analytics and Clarity, hides the banner, and loads both scripts.
3. **Only necessary** stores consent with both tools off, hides the banner, and loads no marketing scripts.
4. After a choice, the banner stays hidden until the visitor reopens it from **Cookie settings** in the public footer (dismissible with ×).
   A new choice overwrites the previous one.
5. Clarity never loads on admin paths, even when Clarity consent is true.
6. Server capture routes never show the banner, analytics, or the cookie-settings control.
7. Consent is per browser session. Sign-out terminates the session and hard-navigates to log-on; the new anonymous session has no stored
   choice, so the banner appears again.
8. The banner is third in the root startup pipeline (after locale mismatch and legal acceptance). It does not open while a higher-priority
   gate is active — see [session-startup-gates.md](./session-startup-gates.md).

Privacy policy link in the banner goes to `/privacy-policy` (and `/en/privacy-policy`).

## Decisions

### Alternatives considered

| Option                      | Why not                                                                           |
| --------------------------- | --------------------------------------------------------------------------------- |
| Browser localStorage only   | Would not align with session recreation on sign-out                               |
| Per-tool toggles in banner  | Product keeps accept-all vs necessary-only; footer reopens the same binary choice |
| Env-wrapped measurement IDs | IDs are public site identifiers; fixed production values                          |

### Chosen

Session-persisted cookie settings exposed on the current session, accept mutations that upsert, site-wide provider in the root startup gates
shell so the footer can reopen settings.

## Implementation

| State          | Banner                      | GA  | Clarity           |
| -------------- | --------------------------- | --- | ----------------- |
| Undecided      | shown (not dismissible)     | off | off               |
| Accept all     | hidden until footer reopens | on  | on (except admin) |
| Mandatory only | hidden until footer reopens | off | off               |

| Area     | Path                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| Table    | `CookieSettings` in `src/server/db/schema.ts`                                 |
| Commands | `sessionCookieSettingAcceptAll` / `sessionCookieSettingAcceptMandatory`       |
| Query    | `sessionCookieSettingFindOne` (via `SessionStartupGates` bootstrap)           |
| UI shell | `SessionStartupGates.tsx` (+ `.graphql`), `CookieConsentContext.tsx`          |
| Banner   | `CookieBanner.tsx`                                                            |
| Footer   | `Footer.tsx` — Cookie settings button                                         |
| Scripts  | `AnalyticsGoogle.tsx` (`G-165LKCGVJJ`), `AnalyticsClarity.tsx` (`l6qxwo5j7v`) |
| Mount    | `src/routes/__root.tsx` via `SessionStartupGates`                             |

Out of scope: per-tool GA vs Clarity toggles, legacy click-tracking hooks, env overrides for measurement IDs.
