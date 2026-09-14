import type { CSSProperties } from 'react';

// Inline email styles mirror `docs/styles/theme.md` + `docs/styles/fonts.md`.
// Clients cannot use Tailwind tokens or Vite-bundled fonts, so hex + stacks
// live here. Keep in sync with the site tokens when the palette changes.

const emailColors = {
    text: '#040316',
    background: '#ffffff',
    page: '#fffdf9',
    muted: '#6b7280',
    border: '#e5e7eb',
    // Match site `--primary` / `--primary-foreground` (theme.md `#404040` / white).
    primary: '#404040',
    primaryForeground: '#ffffff',
} as const;

// Match `--font-sans` / `--font-serif`. Body and title stacks stay separate so
// a display face can be swapped in later; both currently use DM Sans. Web fonts
// load via Google Fonts CDN in `EmailLayout` for clients that allow them; the
// stacks still render cleanly when faces are stripped (Gmail web falls back to
// Helvetica).
const emailFontSans = "'DM Sans', ui-sans-serif, system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif";

const emailFontSerif = emailFontSans;

export const emailStyles = {
    body: {
        margin: '0',
        padding: '0',
        backgroundColor: emailColors.page,
        color: emailColors.text,
        fontFamily: emailFontSans,
        fontSize: '16px',
        lineHeight: '1.5',
        WebkitFontSmoothing: 'antialiased',
    } satisfies CSSProperties,
    container: {
        margin: '0 auto',
        padding: '40px 24px 32px',
        maxWidth: '560px',
        backgroundColor: emailColors.background,
    } satisfies CSSProperties,
    header: {
        textAlign: 'center',
        margin: '0 0 40px',
    } satisfies CSSProperties,
    logo: {
        display: 'block',
        margin: '0 auto',
        border: '0',
        outline: 'none',
    } satisfies CSSProperties,
    heading: {
        margin: '0 0 24px',
        fontFamily: emailFontSerif,
        fontSize: '28px',
        fontWeight: 400,
        lineHeight: '1.3',
        color: emailColors.text,
    } satisfies CSSProperties,
    text: {
        margin: '0 0 16px',
        fontFamily: emailFontSans,
        fontSize: '16px',
        lineHeight: '1.5',
        color: emailColors.text,
    } satisfies CSSProperties,
    sectionHeading: {
        margin: '32px 0 12px',
        fontFamily: emailFontSerif,
        fontSize: '22px',
        fontWeight: 400,
        lineHeight: '1.3',
        color: emailColors.text,
    } satisfies CSSProperties,
    signOff: {
        margin: '32px 0 0',
        fontFamily: emailFontSans,
        fontSize: '16px',
        lineHeight: '1.5',
        color: emailColors.text,
    } satisfies CSSProperties,
    footer: {
        textAlign: 'center',
        margin: '40px 0 0',
        paddingTop: '24px',
    } satisfies CSSProperties,
    footerIcon: {
        display: 'inline-block',
        border: '0',
        outline: 'none',
    } satisfies CSSProperties,
    code: {
        margin: '24px 0',
        fontFamily: emailFontSans,
        fontSize: '32px',
        fontWeight: 700,
        letterSpacing: '0.3em',
        lineHeight: '1.2',
        color: emailColors.text,
    } satisfies CSSProperties,
    link: {
        color: emailColors.text,
        textDecoration: 'underline',
    } satisfies CSSProperties,
    // Mirrors web `Button` default variant + default size (`bg-primary`, `h-9`,
    // `px-4`, `rounded-md`, `text-sm font-medium`). Inline only — Tailwind does
    // not survive email clients.
    buttonSection: {
        textAlign: 'center',
        margin: '24px 0 8px',
    } satisfies CSSProperties,
    button: {
        display: 'inline-block',
        backgroundColor: emailColors.primary,
        color: emailColors.primaryForeground,
        borderRadius: '8px',
        fontFamily: emailFontSans,
        fontSize: '14px',
        fontWeight: 500,
        lineHeight: '20px',
        textAlign: 'center',
        textDecoration: 'none',
        padding: '8px 16px',
        boxSizing: 'border-box',
    } satisfies CSSProperties,
    heroSection: {
        textAlign: 'center',
        margin: '0 0 24px',
    } satisfies CSSProperties,
    heroImage: {
        display: 'block',
        margin: '0 auto',
        border: '0',
        outline: 'none',
    } satisfies CSSProperties,
    // Peer chat bubble — soft secondary surface, left-aligned like received messages.
    chatBubbleSection: {
        margin: '8px 0 24px',
    } satisfies CSSProperties,
    chatBubble: {
        display: 'inline-block',
        maxWidth: '100%',
        backgroundColor: '#f4f4f5',
        borderRadius: '16px',
        fontFamily: emailFontSans,
        fontSize: '16px',
        lineHeight: '1.5',
        color: emailColors.text,
        padding: '12px 16px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        boxSizing: 'border-box',
    } satisfies CSSProperties,
} as const;

/** Absolute URL for a root-relative public asset (`/logo/…`, `/email/…`). */
export function emailAssetUrl(webPageUrl: string, path: string): string {
    return `${webPageUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Fallback origin for React Email `PreviewProps` when env is unavailable. */
export const EMAIL_PREVIEW_WEB_PAGE_URL = 'http://localhost:3000';
