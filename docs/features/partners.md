# Partners

Admins publish bilingual partnership landing pages with optional promo spotlight and curated featured cooks.

## Behavior

Public visitors open `/partners` and `/partners/$pathName`. Drafts stay unpublished until an admin sets a publish time.

After the hero, the page may show:

1. **Chef for any occasion** — bilingual headline and body, optional image, and a CTA card (primary button, WhatsApp, Google). The primary
   button defaults to the booking request form; admins may set an optional custom CTA URL (absolute `http(s)` or site-relative path). When a
   global promo is assigned and still valid, the card shows a gift banner with redeem code and amount. Expired or booking-scoped codes show
   no banner.
2. **Featured cooks** from a curated assignment. Empty assignment hides the section (partners are not geo pages — no travel-radius
   fallback).

Assigned cooks who fail the public listing gate drop off the public page but stay in admin. Banned cooks get a **banned-specific** warning
in the featured-cook editor; other unlisted reasons keep the generic warning.

Curated **testimonials** follow the same pattern as cities — [testimonials.md](./testimonials.md).

By default the primary CTA links to the booking request form without encoding a full address in the URL. An optional `firstSectionCtaUrl`
overrides that button only (WhatsApp / Google stay fixed). Display-only promo on the card; redeem codes are not passed as query params today
unless the custom URL includes them.

## Decisions

### Alternatives considered

| Approach                                 | Pros                        | Cons                    |
| ---------------------------------------- | --------------------------- | ----------------------- |
| Same shared section stack as cities/blog | No partner-only editor fork | Partner-specific chrome |
| Duplicate city editor with renames       | Fast short-term             | Long-term duplication   |

### Chosen

Shared content-section stack. Partner-specific: single display name, curated cooks, fixed first-section slot, optional promo link.

## Next steps

- **How it works** and **Known from** on partner detail — [landing.md](./landing.md).
- **Partner deep-link on booking form** — CTAs may open the form with a short partner id so default venue resolves from the partner record
  (see [booking-request-create.md](./booking-request-create.md)).

## Ideas

**Become a partner — self-serve layout builder (planned)**

Some partners expect one-off page layouts; unbounded custom work does not scale. The product already limits pages to the shared section
stack — the gap is letting prospects compose within those limits before asking for exceptions.

Target behavior:

1. A **Become a partner** entry on `/partners` (list CTA and/or dedicated route).
2. A **layout builder** reusing the same blocks as the admin partner editor — hero, first-section CTA, featured cooks, typed content
   sections — with live preview of what is and is not possible (no free-form HTML or bespoke components).
3. **Submit for admin review**; admins publish or request changes on the existing partner admin surface; drafts stay unpublished until
   approved.

If it is not in the builder, it is not a supported page change.

| Approach                                | Trade-off                                              |
| --------------------------------------- | ------------------------------------------------------ |
| Email/sales builds every page           | Simple ops; custom-dev pressure continues              |
| FAQ of supported blocks only            | Cheap; partners still ask for exceptions               |
| Self-serve builder + admin publish gate | Shows real limits; reuses sections; needs review queue |

Direction: self-serve builder on the public partners surface, admins remain sole publishers.

## Implementation

- Tables / GraphQL / CQRS: `Partners`, `PartnerCooks`, admin upsert/delete, `publicPartner`, `partnerCooksUpdate`,
  `partnerTestimonialsUpdate`
- Partner columns: first-section bilingual copy and image, optional `firstSectionCtaUrl` (http(s) or site-relative; empty clears to default
  booking form), optional `promoCodeId` (FK; rejects missing and booking-request-scoped codes)
- Public/admin promo preview via `partnerPromoFindOne` — null when unassigned, scoped, or expired
- UI: `SectionChefForAnyOccasion` + `SectionChefCta` after hero (always mounted when the partner slot is passed; empty headline/body and
  missing CTA image use muted italic / `ImageOffIcon` placeholders like content sections; `ctaUrl` overrides the primary button href); admin
  cards for first section (incl. CTA link) and promo select
- Admin editor order: SEO → partner name → hero → first section → promo → cooks → testimonials → configurable sections
- Admin: `/admin/partners` (shared admin list cards: name, path, draft/published badge, updated; debounced client search),
  `/admin/partners/$partnerId` (cook search inside the choose-chefs dialog + listing warnings; cook/testimonial saves and in-flight image
  uploads mark the page dirty so the partner subscription does not reset unsaved form fields; hero/first-section image updates merge via
  functional setState so a completing upload cannot clobber newer edits)
- Public: list + detail; sitemap `/sitemap-partners.xml`
- Draft flag: unified `publishedAt` (null = draft)
- Separate admin vs public GraphQL shapes (same pattern as other content pages)

When the builder ships: reuse `ContentSectionsEditor` / `ContentPageView` patterns; persist drafts with `publishedAt = null`; admin list
filter for pending submissions; signed-in session and/or captcha on submit.

See [content-sections.md](../architecture/content-sections.md).
