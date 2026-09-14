# Fonts

| Role     | Family      | Tailwind                            |
| -------- | ----------- | ----------------------------------- |
| Body UI  | **DM Sans** | `font-sans` (default on `body`)     |
| Headings | **DM Sans** | `font-serif` (default on `h1`–`h6`) |

Self-hosted via [`@fontsource-variable/dm-sans`](https://fontsource.org/fonts/dm-sans). `@font-face` rules live in `src/fonts.css` (imported
by `src/styles.css`); Vite bundles the `.woff2` files into the build. There is no Google Fonts CDN.

`font-display: block` avoids a flash of system fallbacks. The latin DM Sans face is also `preload`ed from `src/routes/__root.tsx` so the
first viewport settles quickly.

Tokens: `--font-sans` (body) and `--font-serif` (titles) in `src/styles.css`. Both currently resolve to DM Sans, but they stay separate so a
display face can be swapped into `--font-serif` later without touching call sites. Keep using `font-serif` for headings / brand moments and
`font-sans` for forms, tables, and dense UI.

Transactional email uses the same families via a Google Fonts CDN link — email clients cannot load the self-hosted Fontsource files. See
[`emails.md`](./emails.md).
