import type { Locale } from '../utils/locale';

export {
    SITE_FACEBOOK_URL,
    SITE_INSTAGRAM_URL,
    SITE_LINKEDIN_URL,
    SITE_LOGO,
    SITE_LOGO_DISPLAY,
    SITE_LOGO_SRC_SET,
    SITE_NAME,
    SITE_WHATSAPP_URL,
} from '../../shared/siteBranding';

// Default Open Graph / Twitter Card image. Root-relative so the `seoMeta()`
// helper turns it into an absolute URL using `webPageUrl`. 1200×630 link card
// composed from the wordmark and a homepage still. Pages that pass their own
// image omit width and height because uploads do not store pixel size.
export const DEFAULT_SHARE_IMAGE = '/seo/og-default.webp';

// Intrinsic dimensions of `DEFAULT_SHARE_IMAGE`. Emitted as
// `og:image:width` / `og:image:height` so crawlers (Facebook, LinkedIn) can
// render the share card without an extra probe request. Keep in sync with the
// file in `public/`.
export const DEFAULT_SHARE_IMAGE_DIMENSIONS = { width: 1200, height: 630 } as const;

// Maps app locales to the IETF tags Open Graph expects. Add a new entry here
// whenever you add a locale in `src/web/utils/locale.ts`.
export const OG_LOCALE: Record<Locale, string> = {
    de: 'de_DE',
    en: 'en_US',
};
