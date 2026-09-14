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
// helper turns it into an absolute URL using `webPageUrl`. Uses the PWA
// maskable mark until a dedicated 1200×630 share image exists.
export const DEFAULT_SHARE_IMAGE = '/web-app-manifest-512x512.png';

// Intrinsic dimensions of `DEFAULT_SHARE_IMAGE`. Emitted as
// `og:image:width` / `og:image:height` so crawlers (Facebook, LinkedIn) can
// render the share card without an extra probe request. Keep in sync with the
// file in `public/`.
export const DEFAULT_SHARE_IMAGE_DIMENSIONS = { width: 512, height: 512 } as const;

// Maps app locales to the IETF tags Open Graph expects. Add a new entry here
// whenever you add a locale in `src/web/utils/locale.ts`.
export const OG_LOCALE: Record<Locale, string> = {
    de: 'de_DE',
    en: 'en_US',
};
