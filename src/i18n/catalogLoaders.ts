import type { CatalogLocale } from '../shared/locale';
import type { I18nWebNamespace } from './namespaces';

type CatalogModule = { default: Record<string, unknown> };
type LocaleLoader = () => Promise<CatalogModule>;

export const catalogLoaders: Record<I18nWebNamespace, Record<CatalogLocale, LocaleLoader>> = {
    common: {
        de: () => import('./locales/de/common.json'),
        en: () => import('./locales/en/common.json'),
        fr: () => import('./locales/fr/common.json'),
        it: () => import('./locales/it/common.json'),
    },
    public: {
        de: () => import('./locales/de/public.json'),
        en: () => import('./locales/en/public.json'),
        fr: () => import('./locales/fr/public.json'),
        it: () => import('./locales/it/public.json'),
    },
    publicBooking: {
        de: () => import('./locales/de/publicBooking.json'),
        en: () => import('./locales/en/publicBooking.json'),
        fr: () => import('./locales/fr/publicBooking.json'),
        it: () => import('./locales/it/publicBooking.json'),
    },
    profile: {
        de: () => import('./locales/de/profile.json'),
        en: () => import('./locales/en/profile.json'),
        fr: () => import('./locales/fr/profile.json'),
        it: () => import('./locales/it/profile.json'),
    },
    profileCook: {
        de: () => import('./locales/de/profileCook.json'),
        en: () => import('./locales/en/profileCook.json'),
        fr: () => import('./locales/fr/profileCook.json'),
        it: () => import('./locales/it/profileCook.json'),
    },
    profileCustomer: {
        de: () => import('./locales/de/profileCustomer.json'),
        en: () => import('./locales/en/profileCustomer.json'),
        fr: () => import('./locales/fr/profileCustomer.json'),
        it: () => import('./locales/it/profileCustomer.json'),
    },
    admin: {
        de: () => import('./locales/de/admin.json'),
        en: () => import('./locales/en/admin.json'),
        fr: () => import('./locales/fr/admin.json'),
        it: () => import('./locales/it/admin.json'),
    },
};
