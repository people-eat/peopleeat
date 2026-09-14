import type { WebPageKey } from '../../../shared/webPage';
import { webPageKeys } from '../../../shared/webPage';
import type { Locale } from '../../utils/locale';

const adminWebPageLabels: Record<WebPageKey, Record<Locale, string>> = {
    LANDING: { de: 'Startseite', en: 'Landing' },
    CITIES: { de: 'Städte', en: 'Cities' },
    PARTNERS: { de: 'Partner', en: 'Partners' },
    OCCASIONS: { de: 'Anlässe', en: 'Occasions' },
    CHEFS: { de: 'Köche', en: 'Chefs' },
    BLOG_POSTS: { de: 'Blog', en: 'Blog' },
    ABOUT_US: { de: 'Über uns', en: 'About us' },
    GIFT_CARD: { de: 'Geschenkkarte', en: 'Gift card' },
    HOW_TO_BECOME_A_CHEF: { de: 'Koch werden', en: 'How to become a chef' },
    BOOKING_REQUEST: { de: 'Buchungsanfrage', en: 'Booking request' },
    BOOKING_REQUEST_FORM: { de: 'Buchungsanfrage: Formular', en: 'Booking request: form' },
    BOOKING_REQUEST_CHAT: { de: 'Buchungsanfrage: Chat', en: 'Booking request: chat' },
    CHEF_SIGN_UP: { de: 'Koch-Registrierung', en: 'Chef sign-up' },
    IMPRINT: { de: 'Impressum', en: 'Imprint' },
    TERMS_AND_CONDITIONS: { de: 'AGB', en: 'Terms and conditions' },
    PRIVACY_POLICY: { de: 'Datenschutz', en: 'Privacy policy' },
    SIGN_IN: { de: 'Anmelden', en: 'Log on' },
    PROFILE: { de: 'Profil', en: 'Profile' },
    ADMINISTRATION: { de: 'Admin', en: 'Admin' },
};

export function adminWebPageLabel(webPageKey: WebPageKey, locale: Locale): string {
    return adminWebPageLabels[webPageKey][locale];
}

export function parseAdminWebPageKey(value: string): WebPageKey | null {
    return (webPageKeys as readonly string[]).includes(value) ? (value as WebPageKey) : null;
}
