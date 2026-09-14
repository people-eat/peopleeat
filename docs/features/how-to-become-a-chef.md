# How to become a chef

The public chef recruitment page explains onboarding, benefits, and CTAs to join as a cook.

## Behavior

Visitors open `/how-to-become-a-chef` (or `/en/how-to-become-a-chef`) and see six stacked sections:

1. **Main** — headline, pitch, chef photo; CTA to chef sign-up or profile when already a cook
2. **Onboarding process** — four-step timeline from registration to ready
3. **Benefits** — six benefits beside a photo grid
4. **Ready to start** — second CTA band with the same cook vs non-cook branching
5. **Testimonials** — two static chef quotes
6. **FAQ** — host-oriented booking FAQs (shared accordion with the landing page)

Header and footer match other public pages. FAQ answers feed FAQ structured data on the route.

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

## Implementation

| Piece       | Location                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Page        | `src/web/pages/HowToBecomeAChefPage.tsx` (+ `.graphql`)                                                                                                                        |
| Route / SEO | `src/routes/{-$locale}/how-to-become-a-chef.tsx` — `seoMeta` + FAQ JSON-LD                                                                                                     |
| Sections    | `SectionHowToBecomeAChefMain`, `SectionChefOnboardingProcess`, `SectionBenefitsForChefs`, `SectionReadyToBecomeAChef`, `SectionChefTestimonials`, `SectionQuestionsAndAnswers` |
| Assets      | `public/how-to-become-a-chef/main-section/chef.jpg`, `public/how-to-become-a-chef/benefits-for-chefs-section/{1,2,3}.jpg`                                                      |
