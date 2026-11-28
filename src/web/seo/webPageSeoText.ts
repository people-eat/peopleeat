import { catalogKey } from '../../i18n/catalogKey';
import { t } from '../../i18n/t';
import { contentLocaleText } from '../../shared/contentSection';
import type { Locale } from '../../shared/locale';

export type WebPageSeoFields = {
    titleDe: string;
    titleEn: string | null | undefined;
    titleNl?: string | null | undefined;
    descriptionDe: string;
    descriptionEn: string | null | undefined;
    descriptionNl?: string | null | undefined;
};

function catalogSeo(locale: Locale, catalogPrefix: string, namespace: 'public' | 'publicBooking'): { title: string; description: string } {
    return {
        title: t(locale, namespace, catalogKey(namespace, `${catalogPrefix}.seo.title`)),
        description: t(locale, namespace, catalogKey(namespace, `${catalogPrefix}.seo.description`)),
    };
}

function cmsDeEn(webPage: WebPageSeoFields, locale: Locale): { title: string; description: string } {
    return {
        title: contentLocaleText(webPage.titleDe, webPage.titleEn, locale),
        description: contentLocaleText(webPage.descriptionDe, webPage.descriptionEn, locale),
    };
}

function pickNlField(
    cmsNl: string | null | undefined,
    catalogValue: string | undefined,
    de: string,
    en: string | null | undefined,
): string {
    if (cmsNl?.trim()) return cmsNl.trim();
    if (catalogValue) return catalogValue;
    return contentLocaleText(de, en, 'en');
}

/**
 * Document title / meta description for fixed chrome routes.
 * CMS is DE/EN/NL: `de`/`en` read CMS columns; `nl` prefers CMS Dutch, then catalog
 * `*.seo.*` when a prefix is passed, then EN/DE. Other catalog locales (`fr` / `it` /
 * `ru`) prefer catalog SEO so they do not inherit German tab titles. When
 * `catalogPrefix` is omitted, those locales fall back to EN/DE CMS.
 */
export function webPageSeoText(
    locale: Locale,
    webPage: WebPageSeoFields,
    catalogPrefix?: string,
    namespace: 'public' | 'publicBooking' = 'public',
): { title: string; description: string } {
    if (locale === 'de' || locale === 'en') {
        return cmsDeEn(webPage, locale);
    }
    if (locale === 'nl') {
        const catalog = catalogPrefix ? catalogSeo(locale, catalogPrefix, namespace) : undefined;
        return {
            title: pickNlField(webPage.titleNl, catalog?.title, webPage.titleDe, webPage.titleEn),
            description: pickNlField(webPage.descriptionNl, catalog?.description, webPage.descriptionDe, webPage.descriptionEn),
        };
    }
    if (catalogPrefix) {
        return catalogSeo(locale, catalogPrefix, namespace);
    }
    return cmsDeEn(webPage, locale);
}
