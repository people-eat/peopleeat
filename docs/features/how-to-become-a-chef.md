# How to become a chef

The public chef recruitment page explains onboarding, benefits, and CTAs to join as a cook.

## Behavior

Visitors open `/how-to-become-a-chef` (or `/en/how-to-become-a-chef`) and see stacked sections:

1. **Main** — headline, pitch, chef photo; CTA to chef sign-up or profile when already a cook
2. **Onboarding process** — four-step timeline from registration to ready
3. **Benefits** — six benefits beside a photo grid
4. **Ready to start** — second CTA band with the same cook vs non-cook branching
5. **Cook invite promo** — when `COOK_INVITE` is on: short pitch to invite chef friends and earn rewards (no fee numbers). Cooks go to
   `/profile/invite`; others to chef sign-up. Same toggle as the cook-shell invite entry — see [cook-invite.md](./cook-invite.md)
6. **Expansion markets** — Netherlands and Switzerland founding-chef band
7. **Testimonials** — two static chef quotes
8. **FAQ** — host-oriented booking FAQs (shared accordion with the landing page)

Header and footer match other public pages. FAQ answers feed FAQ structured data on the route.

Country founding-chef URLs under `/how-to-become-a-chef/netherlands` and `/how-to-become-a-chef/switzerland` reuse the invite promo when
`COOK_INVITE` is on. See [market-expansion.md](./market-expansion.md).

## Decisions

### Alternatives considered

| Option                                               | Outcome                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| Placeholder stub only                                | Rejected — recruitment content ready to ship                 |
| Gray scaffold palette                                | Rejected — conflicts with theme tokens                       |
| Full section stack with `Section*` naming and tokens | Chosen — same recruitment story with current chrome and i18n |

### Chosen

Bilingual copy and layout; CTAs to chef sign-up and profile based on whether the visitor is already a cook. Imagery under
`public/how-to-become-a-chef/`.

## Next steps

- Chef-specific FAQ block (accordion still mirrors customer booking FAQs from the home page).
- Chef sign-up CTAs point at `/chef-sign-up` (travel fields; richer profile on chef profile later).
- Keep recruitment invite promo free of commission numbers until commercial confirms (toggle already ships the soft pitch).

## Implementation

| Piece       | Location                                                                                                                                                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page        | `src/web/pages/HowToBecomeAChefPage.tsx` (+ `.graphql`)                                                                                                                                                                                             |
| Route / SEO | `src/routes/{-$locale}/how-to-become-a-chef.tsx` — `seoMeta` + FAQ JSON-LD                                                                                                                                                                          |
| Sections    | `SectionHowToBecomeAChefMain`, `SectionChefOnboardingProcess`, `SectionBenefitsForChefs`, `SectionReadyToBecomeAChef`, `SectionCookInvitePromo` (`COOK_INVITE`), `SectionExpansionMarkets`, `SectionChefTestimonials`, `SectionQuestionsAndAnswers` |
| Assets      | `public/how-to-become-a-chef/main-section/chef.webp`, `public/how-to-become-a-chef/benefits-for-chefs-section/{1,2,3}.webp`                                                                                                                         |
