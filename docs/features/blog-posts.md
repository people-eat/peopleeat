# Blog posts

Admins publish bilingual articles for communication and SEO; the public reads them at `/blog-posts` and per-article URLs.

## Behavior

Visitors browse `/blog-posts` and `/blog-posts/$pathName` (and English paths). Unpublished or future-dated posts stay hidden until
`publishedAt` is in the past (admins can schedule go-live).

Articles use the same flexible content-section stack as cities and partners — headings, media, and body blocks in both languages with
sensible fallbacks when one locale is empty. Blog detail uses an article hero (`SectionBlogHero`): bold title, lead paragraph, then a
rounded featured image (not the full-bleed `SectionHero`). The list also hides hero thumbnails.

## Decisions

### Alternatives considered

| Approach                       | Pros              | Cons                                       |
| ------------------------------ | ----------------- | ------------------------------------------ |
| Bilingual like cities/partners | One section model | Authors must fill EN or accept DE fallback |
| German-only blog               | Faster authoring  | Forks the section stack again              |

### Chosen

Bilingual blog posts on the shared content-section stack — [content-sections.md](../architecture/content-sections.md).

## Next steps

- AI topic suggestion for authors.
- Article visit tracking.
- Richer article structured data beyond basic article SEO meta.

## Implementation

- Tables / GraphQL / CQRS: `BlogPosts`, admin list and upsert/delete, `publicBlogPost`
- Admin: `/admin/blog-posts` (shared admin list cards: title, path, draft/published badge, updated; debounced client search on title/path),
  `/admin/blog-posts/$blogPostId` (`?tab=preview` for full preview)
- Public detail: `seoMeta({ type: 'article' })`; `ContentPageView` with `heroVariant: 'article'` → `SectionBlogHero`; sitemap
  `/sitemap-blog-posts.xml`
