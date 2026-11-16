import { t } from '../../i18n/t';
import { contentLocaleText } from '../../shared/contentSection';
import type { Locale } from '../../shared/locale';

type WebPageSeoFields = {
    titleDe: string;
    titleEn: string | null | undefined;
    descriptionDe: string;
    descriptionEn: string | null | undefined;
};

/**
 * Document title / meta description for fixed chrome routes.
 * CMS is still DE/EN only: `de`/`en` read CMS columns; other catalog locales prefer
 * `public.{prefix}.seo.*` so FR/IT/RU/NL do not inherit German tab titles.
 */
export function webPageSeoText(
    locale: Locale,
    webPage: WebPageSeoFields,
    catalogPrefix: string,
    namespace: 'public' | 'publicBooking' = 'public',
): { title: string; description: string } {
    if (locale === 'de' || locale === 'en') {
        return {
            title: contentLocaleText(webPage.titleDe, webPage.titleEn, locale),
            description: contentLocaleText(webPage.descriptionDe, webPage.descriptionEn, locale),
        };
    }
    return {
        title: t(locale, namespace, `${catalogPrefix}.seo.title`),
        description: t(locale, namespace, `${catalogPrefix}.seo.description`),
    };
}
