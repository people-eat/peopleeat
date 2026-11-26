/**
 * Canonical fixed-route SEO keys and defaults. Mirrored by GraphQL `WebPageKey`.
 * Missing DB rows use these defaults (ghost). See docs/features/admin-web-pages.md.
 */
export const webPageKeys = [
    'LANDING',
    'CITIES',
    'VENUES',
    'OCCASIONS',
    'CHEFS',
    'BLOG_POSTS',
    'ABOUT_US',
    'GIFT_CARD',
    'HOW_TO_BECOME_A_CHEF',
    'COMING_TO',
    'FOUNDING_CHEF',
    'BOOKING_REQUEST',
    'BOOKING_REQUEST_FORM',
    'BOOKING_REQUEST_CHAT',
    'BOOKING_REQUEST_PLAN',
    'CHEF_SIGN_UP',
    'IMPRINT',
    'TERMS_AND_CONDITIONS',
    'PRIVACY_POLICY',
    'SIGN_IN',
    'PROFILE',
    'ADMINISTRATION',
] as const;

export type WebPageKey = (typeof webPageKeys)[number];

/** SEO chrome for signed-in shells. Visit tracking never emits these keys. */
const webPageKeysSeoOnly = ['PROFILE', 'ADMINISTRATION'] as const satisfies readonly WebPageKey[];

const webPageKeysSeoOnlySet = new Set<string>(webPageKeysSeoOnly);

export type WebPageKeyTracked = Exclude<WebPageKey, (typeof webPageKeysSeoOnly)[number]>;

const webPageKeysWithVisitEntity = ['CHEFS', 'CITIES', 'VENUES', 'OCCASIONS', 'BLOG_POSTS'] as const;
export type WebPageKeyWithVisitEntity = (typeof webPageKeysWithVisitEntity)[number];

export const webPageVisitEntityParamByKey = {
    CHEFS: 'cookId',
    CITIES: 'cityId',
    VENUES: 'partnerVenueId',
    OCCASIONS: 'occasionId',
    BLOG_POSTS: 'blogPostId',
} as const satisfies Record<WebPageKeyWithVisitEntity, 'cookId' | 'cityId' | 'partnerVenueId' | 'occasionId' | 'blogPostId'>;

export const webPageVisitDetailPathPatternByKey = {
    CHEFS: '^/chefs/[^/]+/?$',
    CITIES: '^/cities/[^/]+/?$',
    VENUES: '^/(venues|partners)/[^/]+/?$',
    OCCASIONS: '^/occasions/[^/]+/?$',
    BLOG_POSTS: '^/blog-posts/[^/]+/?$',
} as const satisfies Record<WebPageKeyWithVisitEntity, string>;

export const WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX = 8;
export const WEB_PAGE_VISIT_ENTITY_RANK_MAX = 20;
export const WEB_PAGE_VISIT_INDEX_RANK_ID = 'overview';
export const WEB_PAGE_VISIT_ENTITY_SEARCH_MIN_QUERY = 2;

export const webPageKeyPublicPathByKey = {
    LANDING: '/',
    CITIES: '/cities',
    VENUES: '/venues',
    OCCASIONS: '/occasions',
    CHEFS: '/chefs',
    BLOG_POSTS: '/blog-posts',
    ABOUT_US: '/about-us',
    GIFT_CARD: '/gift-cards',
    HOW_TO_BECOME_A_CHEF: '/how-to-become-a-chef',
    COMING_TO: '/coming-to/netherlands',
    FOUNDING_CHEF: '/how-to-become-a-chef/netherlands',
    BOOKING_REQUEST: '/booking-request',
    BOOKING_REQUEST_FORM: '/booking-request/form',
    BOOKING_REQUEST_CHAT: '/booking-request/chat',
    BOOKING_REQUEST_PLAN: '/booking-request/plan',
    CHEF_SIGN_UP: '/chef-sign-up',
    IMPRINT: '/imprint',
    TERMS_AND_CONDITIONS: '/terms-and-conditions',
    PRIVACY_POLICY: '/privacy-policy',
    SIGN_IN: '/log-on',
} as const satisfies Record<WebPageKeyTracked, string>;

const webPageVisitEntityDetailPathPrefixByKey = {
    CHEFS: '/chefs',
    CITIES: '/cities',
    VENUES: '/venues',
    OCCASIONS: '/occasions',
    BLOG_POSTS: '/blog-posts',
} as const satisfies Record<WebPageKeyWithVisitEntity, string>;

export const webPageKeysTrafficDiscovery = [
    'LANDING',
    'CITIES',
    'VENUES',
    'OCCASIONS',
    'CHEFS',
    'BLOG_POSTS',
    'ABOUT_US',
    'HOW_TO_BECOME_A_CHEF',
    'COMING_TO',
    'FOUNDING_CHEF',
] as const satisfies readonly WebPageKeyTracked[];

export const webPageKeysTrafficConversion = [
    'BOOKING_REQUEST',
    'BOOKING_REQUEST_FORM',
    'BOOKING_REQUEST_CHAT',
    'BOOKING_REQUEST_PLAN',
    'GIFT_CARD',
    'CHEF_SIGN_UP',
] as const satisfies readonly WebPageKeyTracked[];

export const webPageKeysTrafficAccount = ['SIGN_IN'] as const satisfies readonly WebPageKeyTracked[];

export const webPageKeysTrafficLegal = [
    'IMPRINT',
    'TERMS_AND_CONDITIONS',
    'PRIVACY_POLICY',
] as const satisfies readonly WebPageKeyTracked[];

export const webPageKeysAnalyticsFunnel = [
    'BOOKING_REQUEST_FORM',
    'GIFT_CARD',
    'CHEF_SIGN_UP',
] as const satisfies readonly WebPageKeyTracked[];

export function webPageVisitEntityPublicPath(key: WebPageKeyWithVisitEntity, pathName: string): `/${string}` {
    return `${webPageVisitEntityDetailPathPrefixByKey[key]}/${pathName}` as `/${string}`;
}

export function webPageKeyIsTracked(key: WebPageKey): key is WebPageKeyTracked {
    return !webPageKeysSeoOnlySet.has(key);
}

export function webPageKeyHasVisitEntity(key: WebPageKey): key is WebPageKeyWithVisitEntity {
    return (webPageKeysWithVisitEntity as readonly string[]).includes(key);
}

/** Cities, venues, occasions, and posts are small catalogs. Chefs stay visit top-20 plus search. */
export function webPageKeyRanksFullCatalog(key: WebPageKeyWithVisitEntity): boolean {
    return key !== 'CHEFS';
}

export function webPageKeyParse(value: string | null | undefined): WebPageKey | null {
    if (!value) return null;
    return (webPageKeys as readonly string[]).includes(value) ? (value as WebPageKey) : null;
}

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
    VENUES: {
        titleDe: 'Locations',
        titleEn: 'Venues',
        descriptionDe: 'Locations, in denen ihr einen Privatkoch buchen könnt.',
        descriptionEn: 'Venues where you can book a private chef.',
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
    COMING_TO: {
        titleDe: 'peopleeat kommt in ein neues Land',
        titleEn: 'peopleeat is coming to a new country',
        descriptionDe: 'Köche können sich jetzt anmelden. Gastgeber buchen Anfang 2027.',
        descriptionEn: 'Chefs can join now. Hosts book from early 2027.',
    },
    FOUNDING_CHEF: {
        titleDe: 'Gründungskoch werden',
        titleEn: 'Become a founding chef',
        descriptionDe: 'Melde dich früh als Privatkoch in einem neuen Markt an.',
        descriptionEn: 'Join early as a private chef in a new market.',
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
    BOOKING_REQUEST_PLAN: {
        titleDe: 'Buchungsanfrage: Plan',
        titleEn: 'Booking request: plan',
        descriptionDe: 'Plant euer privates Dinner in zwei Schritten.',
        descriptionEn: 'Plan your private dinner in two steps.',
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
