import { t } from '../../i18n/t';
import { contentLocaleText } from '../../shared/contentSection';
import type { Locale } from '../utils/locale';

const TITLE_MAX = 60;
const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 160;

export function chefPageCityLabel(
    locale: Locale,
    city: string | null | undefined,
    cityPage: { nameDe: string; nameEn: string; nameNl?: string | null } | null | undefined,
): string | null {
    if (cityPage) {
        const name = contentLocaleText(cityPage.nameDe, cityPage.nameEn, locale, cityPage.nameNl).trim();
        if (name.length > 0) return name;
    }
    const raw = city?.trim() ?? '';
    return raw.length > 0 ? raw : null;
}

export function chefPageTitle(locale: Locale, name: string, city: string | null): string {
    const role = t(locale, 'public', 'chef.seoTitleRole', { name });
    const withCity = city ? t(locale, 'public', 'chef.seoTitleWithCity', { name, city }) : role;
    if (withCity.length <= TITLE_MAX) return withCity;
    if (role.length <= TITLE_MAX) return role;
    if (name.length <= TITLE_MAX) return name;
    return name.slice(0, TITLE_MAX).trimEnd();
}

function collapse(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function clip(value: string, max: number): string {
    const normalized = collapse(value);
    if (normalized.length <= max) return normalized;
    const head = normalized.slice(0, max + 1);
    const lastSpace = head.lastIndexOf(' ');
    const cut = lastSpace >= DESCRIPTION_MIN ? head.slice(0, lastSpace) : normalized.slice(0, max);
    return cut.trimEnd().replace(/[.,;:]+$/, '');
}

export function chefPageDescription(
    locale: Locale,
    input: { name: string; city: string | null; cuisineStyle: string | null | undefined; biographySummary: string },
): string {
    const summary = collapse(input.biographySummary);
    if (summary.length >= DESCRIPTION_MIN) return clip(summary, DESCRIPTION_MAX);
    const cuisine = input.cuisineStyle?.trim() ?? '';
    const cuisineBit = cuisine.length > 0 ? t(locale, 'public', 'chef.seoCuisine', { cuisine }) : '';
    const base = input.city
        ? t(locale, 'public', 'chef.seoBaseWithCity', { name: input.name, city: input.city })
        : t(locale, 'public', 'chef.seoBase', { name: input.name });
    const closer = t(locale, 'public', 'chef.seoCloser');
    return clip(`${base}${cuisineBit}${closer}`, DESCRIPTION_MAX);
}
