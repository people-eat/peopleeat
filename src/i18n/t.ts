import type { TOptions } from 'i18next';

import type { CatalogLocale } from '../shared/locale';
import { catalogEnsure, i18nResourcesLoad } from './catalogCache';
import { i18nCreateSync } from './i18nCreate';
import type { I18nWebNamespace } from './namespaces';

type Translate = (key: string, options?: TOptions) => string;

async function tReady(locale: CatalogLocale, namespaces: readonly I18nWebNamespace[]): Promise<void> {
    await i18nResourcesLoad(locale, namespaces);
}

export function t(locale: CatalogLocale, ns: I18nWebNamespace, key: string, options?: TOptions): string {
    const namespaces: I18nWebNamespace[] = ns === 'common' ? ['common'] : ['common', ns];
    const instance = i18nCreateSync(locale, namespaces);
    const translate = instance.t.bind(instance) as unknown as Translate;
    return translate(key, { ns, ...options });
}

export async function tAsync(locale: CatalogLocale, ns: I18nWebNamespace, key: string, options?: TOptions): Promise<string> {
    await catalogEnsure(locale, ns);
    if (ns !== 'common') await catalogEnsure(locale, 'common');
    await tReady(locale, ns === 'common' ? ['common'] : ['common', ns]);
    return t(locale, ns, key, options);
}
