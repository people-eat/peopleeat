import type { i18n } from 'i18next';
import type { ReactNode } from 'react';
import { use, useMemo } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { i18nResourcesLoadPromise } from '../../i18n/catalogCache';
import { i18nCreateSync } from '../../i18n/i18nCreate';
import type { I18nWebNamespace } from '../../i18n/namespaces';
import type { CatalogLocale } from '../../shared/locale';

const reactBound = new WeakSet<i18n>();

export function I18nProvider({
    locale,
    namespaces,
    children,
}: {
    locale: CatalogLocale;
    namespaces: readonly I18nWebNamespace[];
    children: ReactNode;
}) {
    const nsKey = [...namespaces].sort().join(',');
    use(i18nResourcesLoadPromise(locale, namespaces));
    const instance = useMemo(() => {
        const created = i18nCreateSync(locale, nsKey.split(',') as I18nWebNamespace[]);
        if (!reactBound.has(created)) {
            void created.use(initReactI18next);
            reactBound.add(created);
        }
        return created;
    }, [locale, nsKey]);
    return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
