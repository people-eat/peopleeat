import dmSansLatin from '@fontsource-variable/dm-sans/files/dm-sans-latin-opsz-normal.woff2?url';
import { createRootRoute, HeadContent, Outlet, Scripts, useLocation } from '@tanstack/react-router';
import type { PropsWithChildren } from 'react';
import { Provider as GraphQLClientProvider } from 'urql';
import appCss from '../styles.css?url';
import { Toaster } from '../web/components/base/sonner';
import { TooltipProvider } from '../web/components/base/tooltip';
import { NavigationProgress } from '../web/components/NavigationProgress';
import { RouteError } from '../web/components/RouteError';
import { RouteNotFound } from '../web/components/RouteNotFound';
import { SessionStartupGates } from '../web/components/SessionStartupGates';
import { urqlClient } from '../web/graphql/client';
import { useLocale } from '../web/hooks/useLocale';
import { DEFAULT_SHARE_IMAGE, DEFAULT_SHARE_IMAGE_DIMENSIONS, SITE_NAME } from '../web/seo/seoConstants';
import { webPageUrlGet } from '../web/seo/webPageUrlGet';
import { cn } from '../web/utils/cn';
import { isWorkspaceNoDocumentScrollPath, pathWithoutLocale } from '../web/utils/locale';

// peopleeat is light-only — force the light class before paint so OS dark
// preference never flashes a dark shell.
const THEME_INIT_SCRIPT = `(function(){try{var root=document.documentElement;root.classList.remove('dark');root.classList.add('light');root.setAttribute('data-theme','light');root.style.colorScheme='light';}catch(e){}})();`;

// Site-wide defaults. Every route's `head()` overrides title/description/OG
// per-page via `seoMeta()`; these only matter when a page omits `head()`
// entirely or when a crawler hits a redirect before the locale-aware route
// renders. Root has no locale param, so copy follows `DEFAULT_LOCALE` (`de`).
const FALLBACK_DESCRIPTION = 'peopleeat: Private-Chef buchen. Kunden senden Anfragen, Köche antworten mit Angeboten und Menüs.';

export const Route = createRootRoute({
    head: () => {
        const webPageUrl = webPageUrlGet();
        const shareImageAbsolute = `${webPageUrl}${DEFAULT_SHARE_IMAGE}`;
        return {
            meta: [
                { charSet: 'utf-8' },
                // `maximum-scale=1` prevents iOS Safari's auto-zoom on input
                // focus — the page no longer zooms in (and leaves the user
                // horizontally scrolled afterwards) when the chat composer is
                // tapped. We deliberately omit `user-scalable=no` so pinch-
                // zoom stays available for accessibility: iOS Safari overrides
                // `maximum-scale` for genuine user gestures, and Chrome
                // (since v88) does the same.
                // `viewport-fit=cover` lets `env(safe-area-inset-*)` resolve
                // on iOS (PWA / edge-to-edge Safari) so pinned composers can
                // clear the home indicator — see `--chat-composer-pb` in
                // styles.css and docs/styles/chat.md.
                { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover' },
                { name: 'theme-color', content: '#fffdf9' },
                // Fallback social-share metadata. Per-page `seoMeta()` calls
                // override these for indexable pages; this block exists so
                // crawlers that hit a redirect or a route without its own
                // `head()` still see a complete card.
                { name: 'description', content: FALLBACK_DESCRIPTION },
                { property: 'og:site_name', content: SITE_NAME },
                { property: 'og:type', content: 'website' },
                { property: 'og:title', content: SITE_NAME },
                { property: 'og:description', content: FALLBACK_DESCRIPTION },
                { property: 'og:image', content: shareImageAbsolute },
                { property: 'og:image:width', content: String(DEFAULT_SHARE_IMAGE_DIMENSIONS.width) },
                { property: 'og:image:height', content: String(DEFAULT_SHARE_IMAGE_DIMENSIONS.height) },
                { name: 'twitter:card', content: 'summary_large_image' },
                { name: 'twitter:title', content: SITE_NAME },
                { name: 'twitter:description', content: FALLBACK_DESCRIPTION },
                { name: 'twitter:image', content: shareImageAbsolute },
                // iOS home-screen / web-app cosmetics. Doesn't affect SEO, but
                // pairs with `manifest.json` for a cohesive PWA install. The
                // standard `mobile-web-app-capable` is the modern equivalent;
                // the `apple-` variant stays for older iOS Safari.
                { name: 'mobile-web-app-capable', content: 'yes' },
                { name: 'apple-mobile-web-app-capable', content: 'yes' },
                { name: 'apple-mobile-web-app-title', content: SITE_NAME },
                { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
            ],
            links: [
                { rel: 'stylesheet', href: appCss },
                // Preload the latin DM Sans face — body and titles both use it
                // (`--font-sans` / `--font-serif`). `crossOrigin` is required for
                // font preloads to be usable.
                {
                    rel: 'preload',
                    href: dmSansLatin,
                    as: 'font',
                    type: 'font/woff2',
                    crossOrigin: 'anonymous',
                },
                // PWA manifest — declares short_name, theme_color, start_url
                // for the install prompt. The file lives at `public/manifest.json`.
                { rel: 'manifest', href: '/manifest.json' },
                // RealFaviconGenerator set — SVG first for modern browsers,
                // PNG + ICO fallbacks, apple-touch for iOS home screen.
                { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
                { rel: 'icon', href: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
                { rel: 'shortcut icon', href: '/favicon.ico' },
                { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
            ],
        };
    },
    component: RootComponent,
    errorComponent: RouteError,
    notFoundComponent: RouteNotFound,
    shellComponent: RootDocument,
});

function RootComponent() {
    return <Outlet />;
}

function RootDocument({ children }: PropsWithChildren) {
    const locale = useLocale();
    // `/server/*` routes are headless Chromium capture targets (PDF /
    // screenshot) — see docs/architecture/browser-capture.md. They must not
    // inherit site chrome: NavigationProgress and the toaster would pollute
    // screenshots / PDF pages.
    const pathname = useLocation({ select: (location) => location.pathname });
    const isBrowserCaptureRoute = pathname.startsWith('/server/');
    // Admin / profile shells and the booking form lock the document and scroll
    // an inset pane — drop the document scrollbar gutters there (see theme.md).
    const workspaceNoDocumentScroll = isWorkspaceNoDocumentScrollPath(pathWithoutLocale(pathname, locale));

    return (
        <html lang={locale} className={cn(workspaceNoDocumentScroll && 'workspace-no-document-scroll')} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
                <HeadContent />
            </head>
            <body
                className={cn(
                    // `@container` so Header / Footer / SectionHero layout queries
                    // available width (viewport on full pages; nested preview panes
                    // own a nearer `@container` via ContentPageView).
                    '@container font-sans antialiased wrap-anywhere overflow-x-clip',
                    // `!` so this beats the global `body { @apply bg-background }`
                    // rule — capture pages need a true white canvas.
                    isBrowserCaptureRoute && 'bg-white!',
                )}
            >
                {!isBrowserCaptureRoute && (
                    <a
                        href="#main-content"
                        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-sm focus:ring-[3px] focus:ring-ring/50 focus:outline-none"
                    >
                        {{ de: 'Zum Inhalt springen', en: 'Skip to content' }[locale]}
                    </a>
                )}
                {!isBrowserCaptureRoute && <NavigationProgress />}
                <TooltipProvider>
                    <GraphQLClientProvider value={urqlClient}>
                        <SessionStartupGates enableCookieShell={!isBrowserCaptureRoute}>{children}</SessionStartupGates>
                    </GraphQLClientProvider>
                </TooltipProvider>
                {!isBrowserCaptureRoute && <Toaster position="bottom-center" richColors />}
                <Scripts />
            </body>
        </html>
    );
}
