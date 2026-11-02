# Landing page

The public home at `/` and `/en/` introduces peopleeat with hero video, experience positioning, social proof, FAQ, and city discovery.

## Behavior

Visitors see sections in order (generous vertical spacing between blocks):

1. **Hero** — full-viewport dinner video, bilingual headline, fixed header over media
2. **Experience selection** — three experience cards (casual, signature, gift) with CTAs to booking form or gift card
3. **Comparison** — at-home private chef vs restaurant, CTA to booking form
4. **How booking works** — four muted UI loops (request → offers → chat/call → accept/pay), optional 60-second narrated German film in a
   dialog, CTA to the booking form. Below the `md` breakpoint the section plays portrait iPhone-layout recordings; from `md` up it plays
   desktop landscape recordings. Hidden unless `LANDING_BOOKING_HOW_IT_WORKS` is on (missing DB row = off; see
   [admin-feature-toggles.md](./admin-feature-toggles.md))
5. **How it works** — four lifestyle steps for the evening itself and WhatsApp CTA (reusable section; can hide CTA and use alternative media
   on partner pages)
6. **Shared experiences** — full-bleed quote over lifestyle photography
7. **Customer testimonials** — dual-column vertical marquee of static marketing quotes (not database-driven)
8. **Known from** — press and partner logo band
9. **FAQ** — shared accordion plus FAQ structured data on the route
10. **Support** — WhatsApp contact CTA
11. **Cities** — published cities from the public catalog

Header session chrome (including booking CTA hidden for cooks) and footer match other public content pages. Autoplay video respects reduced
motion. Hero and section loops go through `AutoplayVideo`, which forces the DOM `muted` / `playsInline` properties (Safari ignores React’s
attribute alone), retries `play()` on media-ready and the first user gesture (Low Power Mode), and hides Safari’s native play overlay via
`.autoplay-video` CSS so a blocked autoplay falls back to a still first frame instead of a centered play button. The booking film opens in a
larger dialog (`sm:max-w-4xl`) with a poster preview and play control (no autoplay). The **Unverbindlich anfragen** / **Request without
obligation** CTA (with a short prompt) appears under the player only after the film ends. German narration and burned-in captions on both
`/` and `/en/`.

## Decisions

### Alternatives considered

| Option                                                                       | Outcome                                                                                       |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Minimal scaffold (hero, cities, FAQ only)                                    | Rejected — incomplete marketing story                                                         |
| Gray scaffold palette and unused click-tracking                              | Rejected — conflicts with theme tokens and unused analytics                                   |
| Full section stack with `Section*` naming, theme tokens, and project buttons | Chosen — preserves composition and marquee motion with current design system                  |
| Replace lifestyle How-it-works with UI screen recordings                     | Rejected — evening atmosphere and booking mechanics answer different questions                |
| Booking section between comparison and lifestyle How-it-works                | **Chosen** — desire → differentiation → how to book → what the evening feels like             |
| Autoplay the 60s booking film with sound                                     | Rejected — sound needs an explicit click; muted loops stay ambient                            |
| Wait for English UI recordings before shipping the booking section           | Rejected for v1 — German-first assets; bilingual chrome copy wraps the German product footage |
| Always show the booking-flow section                                         | Rejected — ship behind `LANDING_BOOKING_HOW_IT_WORKS` so ops can stage the rollout            |

### Chosen

Bilingual copy, media, and section order from the established marketing home, plus a dedicated booking-flow section with muted UI loops and
an on-click narrated film, gated by `LANDING_BOOKING_HOW_IT_WORKS`. Experience cards and testimonial marquee keep intentional motion;
typography, colors, and buttons follow project conventions. Marquee pauses under `prefers-reduced-motion`.

## Next steps

- Optional later: database-backed home testimonials; marketing quotes stay static for now.
- Optional later: English booking-loop and film takes for `/en/`.

## Implementation

| Piece         | Location                                                                                                                                                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page          | `src/web/pages/HomePage.tsx` (+ `.graphql`)                                                                                                                                                                                                                            |
| Route / SEO   | `src/routes/{-$locale}/index.tsx` — `seoMeta` via `publicWebPage` + FAQ JSON-LD                                                                                                                                                                                        |
| Sections      | `SectionHero`, `SectionExperienceSelection`, `SectionComparison`, `SectionBookingHowItWorks`, `SectionHowItWorks`, `SectionSharedExperiences`, `SectionCustomerTestimonials`, `SectionKnownFrom`, `SectionQuestionsAndAnswers`, `SectionSupport`, `SectionCities`      |
| Shared media  | `AutoplayVideo.tsx`, `usePrefersReducedMotion.ts`                                                                                                                                                                                                                      |
| Assets        | `public/home/*` (incl. HowItWorks `*.alternative.*` for partner pages, booking loops/film under `public/home/booking-how-it-works/` + `…/mobile/`), `public/shared/known-from-section/`, hero `public/assets/dinner.mp4`                                               |
| Booking media | Masters, edit timeline, voiceover, and capture notes in `media/how-to-book/` (`desktop/` and `mobile/`, see their READMEs). Shipped copies: desktop at `public/home/booking-how-it-works/`, mobile at `…/mobile/`. `SectionBookingHowItWorks` swaps via `useIsMobile`. |
| Feature gate  | `LANDING_BOOKING_HOW_IT_WORKS` via `Session.activeFeatureToggleKeys` on `HomePage`                                                                                                                                                                                     |
| Motion CSS    | `src/styles.css` — `animate-testimonial-scroll` / `-delayed`                                                                                                                                                                                                           |

Portrait masters use the actual iPhone 16 mobile layout under `media/how-to-book/mobile/` (raw takes, four loops, narrated 60-second film,
posters, editable cuts, verification). The home section loads only the matching variant after the viewport breakpoint is known, so both full
sets are not downloaded on one visit.
