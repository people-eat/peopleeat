import i18next from 'i18next';
import type { i18n, ParseKeys, Resource, TOptions } from 'i18next';
import ICU from 'i18next-icu';

import { DEFAULT_LOCALE } from '../shared/locale';
import type { CatalogLocale } from '../shared/locale';
import { emailCatalogLoaders } from './emailCatalogLoaders';
import { i18nFallbackLng, i18nFallbackLocales } from './fallbackLocales';
import { I18N_EMAIL_NAMESPACE } from './namespaces';

type Catalog = Record<string, unknown>;
type Translate = (key: string, options?: TOptions) => string;

const values = new Map<string, Catalog>();
const instances = new Map<string, i18n>();

export function emailCatalogRegister(locale: CatalogLocale, catalog: Catalog): void {
    values.set(locale, catalog);
}

async function emailCatalogEnsure(locale: CatalogLocale): Promise<Catalog> {
    const cached = values.get(locale);
    if (cached) return cached;
    const mod = await emailCatalogLoaders[locale]();
    values.set(locale, mod.default);
    return mod.default;
}

function emailI18nCreateSync(locale: CatalogLocale): i18n {
    const cached = instances.get(locale);
    if (cached) return cached;

    const resources: Resource = {
        [locale]: { [I18N_EMAIL_NAMESPACE]: values.get(locale) ?? {} },
    };
    for (const fallback of i18nFallbackLocales(locale)) {
        resources[fallback] = { [I18N_EMAIL_NAMESPACE]: values.get(fallback) ?? {} };
    }

    const instance = i18next.createInstance();
    instance.use(new ICU());
    void instance.init({
        lng: locale,
        fallbackLng: i18nFallbackLng(locale),
        ns: [I18N_EMAIL_NAMESPACE],
        defaultNS: I18N_EMAIL_NAMESPACE,
        resources,
        initAsync: false,
        interpolation: { escapeValue: false },
        returnNull: false,
        parseMissingKeyHandler: (_key, defaultValue) => defaultValue ?? '',
    });
    instances.set(locale, instance);
    return instance;
}

export async function tEmailReady(locale: CatalogLocale): Promise<void> {
    await emailCatalogEnsure(locale);
    if (locale !== DEFAULT_LOCALE) await emailCatalogEnsure(DEFAULT_LOCALE);
}

export function tEmail(locale: CatalogLocale, key: ParseKeys<'email'>, options?: TOptions): string {
    const instance = emailI18nCreateSync(locale);
    const translate = instance.t.bind(instance) as unknown as Translate;
    return translate(key as string, { ns: I18N_EMAIL_NAMESPACE, ...options });
}

export async function tEmailAsync(locale: CatalogLocale, key: ParseKeys<'email'>, options?: TOptions): Promise<string> {
    await tEmailReady(locale);
    return tEmail(locale, key, options);
}
