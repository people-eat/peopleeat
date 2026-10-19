# Admin important links

One admin page of curated external tools and social profiles for day-to-day ops — open in a new tab from the sidebar.

## Behavior

At `/admin/links` (sidebar: Important Links), admins see a static grouped card list (shared admin link-card chrome; opens in a new tab):

- **Infrastructure** — Coolify, Kuma, Grafana, Langfuse, IONOS, Metabase, Google Search Console, Microsoft Clarity, OpenAI Dashboard,
  Stripe, GitHub Projects
- **Notifications & messaging** — Resend, Klaviyo, Slack, WhatsApp Manager
- **Social media** — Facebook, Instagram, LinkedIn

Link titles are brand names (same in DE/EN); group headings are bilingual.

## Decisions

### Alternatives considered

| Option                         | Pros                                 | Cons                           |
| ------------------------------ | ------------------------------------ | ------------------------------ |
| Database-backed editable links | Operators change URLs without deploy | Overkill for a small fixed set |
| Hardcoded list on the page     | Zero schema/API; change via PR       | Deploy to add or update a link |

### Chosen

Hardcoded grouped links on the admin links page; catalog entry supplies nav title, icon, and SEO description.

## Implementation

- Page: `src/web/pages/admin/AdminLinksPage.tsx` (`ADMIN_IMPORTANT_LINK_GROUPS`)
- Route: `src/routes/{-$locale}/admin/links.tsx` (`noindex`)
- Shell / nav: [admin-shell.md](./admin-shell.md)
