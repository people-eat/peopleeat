# Landing page

The public home at `/` and `/en/` introduces peopleeat with hero video, experience positioning, social proof, FAQ, and city discovery.

## Behavior

Visitors see sections in order (generous vertical spacing between blocks):

1. **Hero** — full-viewport dinner video, bilingual headline, sticky header over media
2. **Experience selection** — three experience cards (casual, signature, gift) with CTAs to booking form or gift card
3. **Comparison** — at-home private chef vs restaurant, CTA to booking form
4. **How it works** — four steps and WhatsApp CTA (reusable section; can hide CTA elsewhere)
5. **Shared experiences** — full-bleed quote over lifestyle photography
6. **Customer testimonials** — dual-column vertical marquee of static marketing quotes (not database-driven)
7. **Known from** — press and partner logo band
8. **FAQ** — shared accordion plus FAQ structured data on the route
9. **Support** — WhatsApp contact CTA
10. **Cities** — published cities from the public catalog

Header session chrome (including booking CTA hidden for cooks) and footer match other public content pages. Autoplay video respects reduced
motion. Hero and section loops go through `AutoplayVideo`, which forces the DOM `muted` / `playsInline` properties (Safari ignores React’s
attribute alone), retries `play()` on media-ready and the first user gesture (Low Power Mode), and hides Safari’s native play overlay via
`.autoplay-video` CSS so a blocked autoplay falls back to a still first frame instead of a centered play button.

## Decisions

### Alternatives considered

| Option                                                                       | Outcome                                                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Minimal scaffold (hero, cities, FAQ only)                                    | Rejected — incomplete marketing story                                        |
| Gray scaffold palette and unused click-tracking                              | Rejected — conflicts with theme tokens and unused analytics                  |
| Full section stack with `Section*` naming, theme tokens, and project buttons | Chosen — preserves composition and marquee motion with current design system |

### Chosen

Bilingual copy, media, and section order from the established marketing home. Experience cards and testimonial marquee keep intentional
motion; typography, colors, and buttons follow project conventions. Marquee pauses under `prefers-reduced-motion`.

## Next steps

- Add **How it works** and **Known from** bands to city and partner detail pages (sections already exist on the home page) — see
  [cities.md](./cities.md), [partners.md](./partners.md).
- Optional later: database-backed home testimonials; marketing quotes stay static for now.

## Implementation

| Piece        | Location                                                                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page         | `src/web/pages/HomePage.tsx` (+ `.graphql`)                                                                                                                                                                                           |
| Route / SEO  | `src/routes/{-$locale}/index.tsx` — `seoMeta` via `publicWebPage` + FAQ JSON-LD                                                                                                                                                       |
| Sections     | `SectionHero`, `SectionExperienceSelection`, `SectionComparison`, `SectionHowItWorks`, `SectionSharedExperiences`, `SectionCustomerTestimonials`, `SectionKnownFrom`, `SectionQuestionsAndAnswers`, `SectionSupport`, `SectionCities` |
| Shared media | `AutoplayVideo.tsx`, `usePrefersReducedMotion.ts`                                                                                                                                                                                     |
| Assets       | `public/home/*`, `public/shared/known-from-section/`, hero `public/assets/dinner.mp4`                                                                                                                                                 |
| Motion CSS   | `src/styles.css` — `animate-testimonial-scroll` / `-delayed`                                                                                                                                                                          |
