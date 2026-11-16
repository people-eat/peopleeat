import type { CatalogLocale } from '../shared/locale';

type CatalogModule = { default: Record<string, unknown> };

export const emailCatalogLoaders: Record<CatalogLocale, () => Promise<CatalogModule>> = {
    de: () => import('./locales/de/email.json'),
    en: () => import('./locales/en/email.json'),
    fr: () => import('./locales/fr/email.json'),
    it: () => import('./locales/it/email.json'),
    ru: () => import('./locales/ru/email.json'),
    nl: () => import('./locales/nl/email.json'),
};
