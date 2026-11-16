import { catalogRegister } from '../i18n/catalogCache';
import deAdmin from '../i18n/locales/de/admin.json';
import deCommon from '../i18n/locales/de/common.json';
import deEmail from '../i18n/locales/de/email.json';
import deProfile from '../i18n/locales/de/profile.json';
import deProfileCook from '../i18n/locales/de/profileCook.json';
import deProfileCustomer from '../i18n/locales/de/profileCustomer.json';
import dePublic from '../i18n/locales/de/public.json';
import dePublicBooking from '../i18n/locales/de/publicBooking.json';
import enAdmin from '../i18n/locales/en/admin.json';
import enCommon from '../i18n/locales/en/common.json';
import enEmail from '../i18n/locales/en/email.json';
import enProfile from '../i18n/locales/en/profile.json';
import enProfileCook from '../i18n/locales/en/profileCook.json';
import enProfileCustomer from '../i18n/locales/en/profileCustomer.json';
import enPublic from '../i18n/locales/en/public.json';
import enPublicBooking from '../i18n/locales/en/publicBooking.json';
import frAdmin from '../i18n/locales/fr/admin.json';
import frCommon from '../i18n/locales/fr/common.json';
import frEmail from '../i18n/locales/fr/email.json';
import frProfile from '../i18n/locales/fr/profile.json';
import frProfileCook from '../i18n/locales/fr/profileCook.json';
import frProfileCustomer from '../i18n/locales/fr/profileCustomer.json';
import frPublic from '../i18n/locales/fr/public.json';
import frPublicBooking from '../i18n/locales/fr/publicBooking.json';
import itAdmin from '../i18n/locales/it/admin.json';
import itCommon from '../i18n/locales/it/common.json';
import itEmail from '../i18n/locales/it/email.json';
import itProfile from '../i18n/locales/it/profile.json';
import itProfileCook from '../i18n/locales/it/profileCook.json';
import itProfileCustomer from '../i18n/locales/it/profileCustomer.json';
import itPublic from '../i18n/locales/it/public.json';
import itPublicBooking from '../i18n/locales/it/publicBooking.json';
import type { I18nWebNamespace } from '../i18n/namespaces';
import { emailCatalogRegister } from '../i18n/tEmail';
import type { CatalogLocale } from '../shared/locale';

type Catalog = Record<string, unknown>;

const WEB: Record<I18nWebNamespace, Record<CatalogLocale, Catalog>> = {
    common: { de: deCommon, en: enCommon, fr: frCommon, it: itCommon },
    public: { de: dePublic, en: enPublic, fr: frPublic, it: itPublic },
    publicBooking: { de: dePublicBooking, en: enPublicBooking, fr: frPublicBooking, it: itPublicBooking },
    profile: { de: deProfile, en: enProfile, fr: frProfile, it: itProfile },
    profileCook: { de: deProfileCook, en: enProfileCook, fr: frProfileCook, it: itProfileCook },
    profileCustomer: { de: deProfileCustomer, en: enProfileCustomer, fr: frProfileCustomer, it: itProfileCustomer },
    admin: { de: deAdmin, en: enAdmin, fr: frAdmin, it: itAdmin },
};

const EMAIL: Record<CatalogLocale, Catalog> = {
    de: deEmail,
    en: enEmail,
    fr: frEmail,
    it: itEmail,
};

let done = false;

/** Register every catalog in-process so GraphQL mappers and emails can call `t()` / `tEmail()` synchronously. */
export function serverI18nBootstrap(): void {
    if (done) return;
    done = true;
    for (const namespace of Object.keys(WEB) as I18nWebNamespace[]) {
        for (const locale of Object.keys(WEB[namespace]) as CatalogLocale[]) {
            catalogRegister(locale, namespace, WEB[namespace][locale]);
        }
    }
    for (const locale of Object.keys(EMAIL) as CatalogLocale[]) {
        emailCatalogRegister(locale, EMAIL[locale]);
    }
}
