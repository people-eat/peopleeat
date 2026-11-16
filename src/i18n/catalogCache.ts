import type { CatalogLocale } from '../shared/locale';
import { catalogLoaders } from './catalogLoaders';
import { i18nFallbackLocales } from './fallbackLocales';
import type { I18nWebNamespace } from './namespaces';

type Catalog = Record<string, unknown>;

const values = new Map<string, Catalog>();
const promises = new Map<string, Promise<Catalog>>();
const loadPromises = new Map<string, Promise<void>>();

function cacheKey(locale: CatalogLocale, ns: I18nWebNamespace): string {
    return `${locale}:${ns}`;
}

export function catalogEnsure(locale: CatalogLocale, ns: I18nWebNamespace): Promise<Catalog> {
    const key = cacheKey(locale, ns);
    const cached = values.get(key);
    if (cached) return Promise.resolve(cached);
    let pending = promises.get(key);
    if (!pending) {
        pending = catalogLoaders[ns][locale]().then((mod) => {
            values.set(key, mod.default);
            return mod.default;
        });
        promises.set(key, pending);
    }
    return pending;
}

export function catalogGet(locale: CatalogLocale, ns: I18nWebNamespace): Catalog {
    const catalog = values.get(cacheKey(locale, ns));
    if (!catalog) {
        throw new Error(`i18n catalog not loaded: ${locale}/${ns}`);
    }
    return catalog;
}

/** Server bootstrap and tests register catalogs without going through Vite loaders. */
export function catalogRegister(locale: CatalogLocale, ns: I18nWebNamespace, catalog: Catalog): void {
    values.set(cacheKey(locale, ns), catalog);
}

function uniqueNamespaces(namespaces: readonly I18nWebNamespace[]): I18nWebNamespace[] {
    return [...new Set(namespaces)];
}

export async function i18nResourcesLoad(locale: CatalogLocale, namespaces: readonly I18nWebNamespace[]): Promise<void> {
    const ns = uniqueNamespaces(namespaces);
    const locales: CatalogLocale[] = [locale, ...i18nFallbackLocales(locale)];
    await Promise.all(locales.flatMap((item) => ns.map((namespace) => catalogEnsure(item, namespace))));
}

export function i18nResourcesLoadPromise(locale: CatalogLocale, namespaces: readonly I18nWebNamespace[]): Promise<void> {
    const key = `${locale}:${uniqueNamespaces(namespaces).slice().sort().join(',')}`;
    const existing = loadPromises.get(key);
    if (existing) return existing;
    const pending = i18nResourcesLoad(locale, namespaces);
    loadPromises.set(key, pending);
    return pending;
}
