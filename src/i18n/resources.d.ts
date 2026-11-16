import type deAdmin from './locales/de/admin.json';
import type deCommon from './locales/de/common.json';
import type deEmail from './locales/de/email.json';
import type deProfile from './locales/de/profile.json';
import type deProfileCook from './locales/de/profileCook.json';
import type deProfileCustomer from './locales/de/profileCustomer.json';
import type dePublic from './locales/de/public.json';
import type dePublicBooking from './locales/de/publicBooking.json';

declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'common';
        returnNull: false;
        resources: {
            common: typeof deCommon;
            public: typeof dePublic;
            publicBooking: typeof dePublicBooking;
            profile: typeof deProfile;
            profileCook: typeof deProfileCook;
            profileCustomer: typeof deProfileCustomer;
            admin: typeof deAdmin;
            email: typeof deEmail;
        };
    }
}
