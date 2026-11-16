import i18next from 'i18next';
import type { i18n, Resource } from 'i18next';
import ICU from 'i18next-icu';

import type { CatalogLocale } from '../shared/locale';
import { catalogGet } from './catalogCache';
import { i18nFallbackLng, i18nFallbackLocales } from './fallbackLocales';
import type { I18nWebNamespace } from './namespaces';

function uniqueNamespaces(namespaces: readonly I18nWebNamespace[]): I18nWebNamespace[] {
    return [...new Set(namespaces)];
}

function resourcesKey(locale: CatalogLocale, namespaces: readonly I18nWebNamespace[]): string {
    return `${locale}:${uniqueNamespaces(namespaces).slice().sort().join(',')}`;
}

const instances = new Map<string, i18n>();

export function i18nCreateSync(locale: CatalogLocale, namespaces: readonly I18nWebNamespace[]): i18n {
    const ns = uniqueNamespaces(namespaces);
    const key = resourcesKey(locale, ns);
    const cached = instances.get(key);
    if (cached) return cached;

    const resources: Resource = {
        [locale]: {},
    };
    for (const fallback of i18nFallbackLocales(locale)) {
        resources[fallback] = {};
    }
    for (const namespace of ns) {
        resources[locale]![namespace] = catalogGet(locale, namespace);
        for (const fallback of i18nFallbackLocales(locale)) {
            resources[fallback]![namespace] = catalogGet(fallback, namespace);
        }
    }

    const instance = i18next.createInstance();
    instance.use(new ICU());
    void instance.init({
        lng: locale,
        fallbackLng: i18nFallbackLng(locale),
        ns,
        defaultNS: 'common',
        resources,
        interpolation: { escapeValue: false },
        returnNull: false,
        parseMissingKeyHandler: (_key, defaultValue) => defaultValue ?? '',
    });
    instances.set(key, instance);
    return instance;
}
