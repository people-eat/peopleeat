/**
 * Canonical fixed-route SEO keys and defaults. Mirrored by GraphQL `WebPageKey`.
 * Missing DB rows use these defaults (ghost). See docs/features/admin-web-pages.md.
 */
export const webPageKeys = [
    'LANDING',
    'CITIES',
    'PARTNERS',
    'OCCASIONS',
    'CHEFS',
    'BLOG_POSTS',
    'ABOUT_US',
    'GIFT_CARD',
    'HOW_TO_BECOME_A_CHEF',
    'BOOKING_REQUEST',
    'BOOKING_REQUEST_FORM',
    'BOOKING_REQUEST_CHAT',
    'CHEF_SIGN_UP',
    'IMPRINT',
    'TERMS_AND_CONDITIONS',
    'PRIVACY_POLICY',
    'SIGN_IN',
    'PROFILE',
    'ADMINISTRATION',
] as const;

export type WebPageKey = (typeof webPageKeys)[number];

export type WebPageSeoDefaults = {
    titleDe: string;
    titleEn: string;
    descriptionDe: string;
    descriptionEn: string;
};

export const webPageDefaults: Record<WebPageKey, WebPageSeoDefaults> = {
    LANDING: {
        titleDe: 'Private Chefs buchen',
        titleEn: 'Book private chefs',
        descriptionDe:
            'peopleeat verbindet Kunden mit Privatköchen: Buchungsanfragen stellen, Angebote vergleichen und Menüs konfigurieren.',
        descriptionEn: 'peopleeat connects customers with private chefs: send booking requests, compare offers, and configure menus.',
    },
    CITIES: {
        titleDe: 'Städte',
        titleEn: 'Cities',
        descriptionDe: 'Finde Privatköche in deiner Stadt.',
        descriptionEn: 'Find private chefs in your city.',
    },
    PARTNERS: {
        titleDe: 'Partner',
        titleEn: 'Partners',
        descriptionDe: 'Marken und Kooperationen mit peopleeat.',
        descriptionEn: 'Brands and collaborations with peopleeat.',
    },
    OCCASIONS: {
        titleDe: 'Anlässe',
        titleEn: 'Occasions',
        descriptionDe: 'Privatköche für jeden Anlass, von Geburtstag bis Firmenfeier.',
        descriptionEn: 'Private chefs for every occasion, from birthdays to company events.',
    },
    CHEFS: {
        titleDe: 'Köche',
        titleEn: 'Chefs',
        descriptionDe: 'Entdecke Privatköche auf peopleeat.',
        descriptionEn: 'Discover private chefs on peopleeat.',
    },
    BLOG_POSTS: {
        titleDe: 'Blog',
        titleEn: 'Blog',
        descriptionDe: 'Tipps, Geschichten und Neuigkeiten rund um private Dining-Erlebnisse.',
        descriptionEn: 'Tips, stories, and news about private dining experiences.',
    },
    ABOUT_US: {
        titleDe: 'Über uns',
        titleEn: 'About us',
        descriptionDe: 'Erfahre mehr über peopleeat und unsere Mission.',
        descriptionEn: 'Learn more about peopleeat and our mission.',
    },
    GIFT_CARD: {
        titleDe: 'Geschenkkarte',
        titleEn: 'Gift card',
        descriptionDe: 'Verschenke ein unvergessliches Dinner mit einem Privatkoch.',
        descriptionEn: 'Gift an unforgettable dinner with a private chef.',
    },
    HOW_TO_BECOME_A_CHEF: {
        titleDe: 'Koch werden',
        titleEn: 'How to become a chef',
        descriptionDe: 'So wirst du Privatkoch auf peopleeat.',
        descriptionEn: 'How to become a private chef on peopleeat.',
    },
    BOOKING_REQUEST: {
        titleDe: 'Buchungsanfrage',
        titleEn: 'Booking request',
        descriptionDe: 'Stelle eine Buchungsanfrage für einen Privatkoch.',
        descriptionEn: 'Submit a booking request for a private chef.',
    },
    BOOKING_REQUEST_FORM: {
        titleDe: 'Buchungsanfrage: Formular',
        titleEn: 'Booking request: form',
        descriptionDe: 'Formular zur Buchungsanfrage für einen Privatkoch.',
        descriptionEn: 'Form to request a private chef booking.',
    },
    BOOKING_REQUEST_CHAT: {
        titleDe: 'Buchungsanfrage: Chat',
        titleEn: 'Booking request: chat',
        descriptionDe: 'Stelle deine Buchungsanfrage im Chat.',
        descriptionEn: 'Submit your booking request in chat.',
    },
    CHEF_SIGN_UP: {
        titleDe: 'Als Koch registrieren',
        titleEn: 'Chef sign-up',
        descriptionDe: 'Registriere dich als Privatkoch auf peopleeat.',
        descriptionEn: 'Sign up as a private chef on peopleeat.',
    },
    IMPRINT: {
        titleDe: 'Impressum',
        titleEn: 'Imprint',
        descriptionDe: 'Impressum und Anbieterkennzeichnung von peopleeat.',
        descriptionEn: 'Legal imprint and provider information for peopleeat.',
    },
    TERMS_AND_CONDITIONS: {
        titleDe: 'Allgemeine Geschäftsbedingungen',
        titleEn: 'Terms and conditions',
        descriptionDe: 'Die Allgemeinen Geschäftsbedingungen von peopleeat.',
        descriptionEn: 'The terms and conditions governing the use of peopleeat.',
    },
    PRIVACY_POLICY: {
        titleDe: 'Datenschutzerklärung',
        titleEn: 'Privacy policy',
        descriptionDe: 'Wie peopleeat personenbezogene Daten verarbeitet.',
        descriptionEn: 'How peopleeat processes personal data.',
    },
    SIGN_IN: {
        titleDe: 'Anmelden',
        titleEn: 'Sign in',
        descriptionDe: 'Melde dich mit E-Mail-Code oder Passkey an.',
        descriptionEn: 'Sign in with an email code or a passkey.',
    },
    PROFILE: {
        titleDe: 'Profil',
        titleEn: 'Profile',
        descriptionDe: 'Dein peopleeat-Profil.',
        descriptionEn: 'Your peopleeat profile.',
    },
    ADMINISTRATION: {
        titleDe: 'Admin',
        titleEn: 'Admin',
        descriptionDe: 'Administrationsbereich.',
        descriptionEn: 'Administration area.',
    },
};
