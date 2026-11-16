import type { ParseKeys, TOptions } from 'i18next';

import type { CatalogLocale } from '../shared/locale';
import { catalogEnsure, i18nResourcesLoad } from './catalogCache';
import { i18nCreateSync } from './i18nCreate';
import type { I18nWebNamespace } from './namespaces';

type Translate = (key: string, options?: TOptions) => string;

async function tReady(locale: CatalogLocale, namespaces: readonly I18nWebNamespace[]): Promise<void> {
    await i18nResourcesLoad(locale, namespaces);
}

/** Isomorphic catalog lookup. Keys must be string literals from the namespace JSON (no `` `…${…}` ``). */
export function t<Ns extends I18nWebNamespace>(locale: CatalogLocale, ns: Ns, key: ParseKeys<Ns>, options?: TOptions): string {
    const namespaces: I18nWebNamespace[] = ns === 'common' ? ['common'] : ['common', ns];
    const instance = i18nCreateSync(locale, namespaces);
    const translate = instance.t.bind(instance) as unknown as Translate;
    return translate(key as string, { ns, ...options });
}

export async function tAsync<Ns extends I18nWebNamespace>(
    locale: CatalogLocale,
    ns: Ns,
    key: ParseKeys<Ns>,
    options?: TOptions,
): Promise<string> {
    await catalogEnsure(locale, ns);
    if (ns !== 'common') await catalogEnsure(locale, 'common');
    await tReady(locale, ns === 'common' ? ['common'] : ['common', ns]);
    return t(locale, ns, key, options);
}
