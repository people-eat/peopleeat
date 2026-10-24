# About us

The public about page tells the founding story, mission, team, and how to get in touch.

## Behavior

Visitors open `/about-us` (or `/en/about-us`) and see four stacked sections:

1. **How we got started** — founders photo beside the Mannheim origin story and page title
2. **Our mission** — dark band with the mission statement
3. **Meet our team** — intro, team photo, short bios with external links
4. **Want to join** — headline and mailto contact to the site contact email

Header and footer match other public content pages with session-aware navigation.

## Decisions

### Alternatives considered

| Option                                                      | Outcome                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Placeholder stub only                                       | Rejected — story and layout ready to ship                                              |
| Gray scaffold palette                                       | Rejected — conflicts with heading and theme tokens                                     |
| Port story and layout with `Section*` components and tokens | Chosen — same narrative with current fonts, colors, header, footer, and bilingual copy |

### Chosen

Bilingual body text and section layout with theme-aligned typography and imagery under `public/about-us/`.

## Ideas

Dedicated careers or talent-acquisition link in **Want to join** once a destination URL exists (today mailto only).

## Implementation

| Piece       | Location                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Page        | `src/web/pages/AboutUsPage.tsx` (+ `.graphql`)                                                            |
| Route / SEO | `src/routes/{-$locale}/about-us.tsx` — `seoMeta` via `publicWebPage`                                      |
| Sections    | `SectionHowWeStarted`, `SectionOurMission`, `SectionMeetOurTeam`, `SectionWantToJoinOurTeam`              |
| Assets      | `public/about-us/how-we-started-section/founders.webp`, `public/about-us/meet-our-team-section/team.webp` |
| Contact CTA | `mailto:` using `SITE_CONTACT_EMAIL` from `src/shared/siteBranding.ts`                                    |
