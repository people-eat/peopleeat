import { contentLocaleText } from '../../shared/contentSection';
import type { Locale } from '../utils/locale';

const TITLE_MAX = 60;
const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 160;

export function chefPageCityLabel(
    locale: Locale,
    city: string | null | undefined,
    cityPage: { nameDe: string; nameEn: string } | null | undefined,
): string | null {
    if (cityPage) {
        const name = contentLocaleText(cityPage.nameDe, cityPage.nameEn, locale).trim();
        if (name.length > 0) return name;
    }
    const raw = city?.trim() ?? '';
    return raw.length > 0 ? raw : null;
}

export function chefPageTitle(locale: Locale, name: string, city: string | null): string {
    const role = { de: `${name}, Privatkoch`, en: `${name}, private chef` }[locale];
    const withCity = city ? { de: `${name}, Privatkoch in ${city}`, en: `${name}, private chef in ${city}` }[locale] : role;
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
    const cityBit = input.city ? ` in ${input.city}` : '';
    const cuisine = input.cuisineStyle?.trim() ?? '';
    const cuisineBit = cuisine.length > 0 ? { de: ` Küche: ${cuisine}.`, en: ` Cuisine: ${cuisine}.` }[locale] : '';
    const base = {
        de: `${input.name} kocht als Privatkoch${cityBit}.${cuisineBit}`,
        en: `${input.name} cooks as a private chef${cityBit}.${cuisineBit}`,
    }[locale];
    const closer = {
        de: ' Unverbindliche Anfrage über peopleeat.',
        en: ' Send a no-obligation request on peopleeat.',
    }[locale];
    return clip(`${base}${closer}`, DESCRIPTION_MAX);
}
