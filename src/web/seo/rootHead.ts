import dmSansLatin from '@fontsource-variable/dm-sans/files/dm-sans-latin-opsz-normal.woff2?url';
import appCss from '../../styles.css?url';
import { DEFAULT_SHARE_IMAGE, DEFAULT_SHARE_IMAGE_DIMENSIONS, SITE_NAME } from './seoConstants';
import { webPageUrlGet } from './webPageUrlGet';

// Root has no locale param, so this follows `DEFAULT_LOCALE` (`de`).
// Per-page `seoMeta()` overrides it. The fallback covers redirects, bare 404s, and routes that omit `head()`.
const FALLBACK_DESCRIPTION = 'peopleeat: Private-Chef buchen. Kunden senden Anfragen, Köche antworten mit Angeboten und Menüs.';

// `maximum-scale=1` stops iOS Safari from zooming a focused input and leaving the page scrolled sideways.
// Pinch-zoom stays available: `user-scalable=no` is omitted, and iOS / Chrome override `maximum-scale` for real gestures.
// `viewport-fit=cover` lets `env(safe-area-inset-*)` resolve so pinned composers clear the home indicator.
const VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover';

export function rootHead() {
    const shareImageAbsolute = `${webPageUrlGet()}${DEFAULT_SHARE_IMAGE}`;

    return {
        meta: [
            { charSet: 'utf-8' },
            { name: 'viewport', content: VIEWPORT },
            { name: 'theme-color', content: '#fffdf9' },
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
            // `mobile-web-app-capable` is the current name. The `apple-` variant stays for older iOS Safari.
            { name: 'mobile-web-app-capable', content: 'yes' },
            { name: 'apple-mobile-web-app-capable', content: 'yes' },
            { name: 'apple-mobile-web-app-title', content: SITE_NAME },
            { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        ],
        links: [
            { rel: 'stylesheet', href: appCss },
            // `crossOrigin` is required or the browser will not use the preloaded face.
            {
                rel: 'preload',
                href: dmSansLatin,
                as: 'font' as const,
                type: 'font/woff2',
                crossOrigin: 'anonymous' as const,
            },
            { rel: 'manifest', href: '/manifest.json' },
            { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
            { rel: 'icon', href: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
            { rel: 'shortcut icon', href: '/favicon.ico' },
            { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        ],
    };
}
