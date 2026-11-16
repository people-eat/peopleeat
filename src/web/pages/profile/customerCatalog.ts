import type { ParseKeys } from 'i18next';
import type { LucideIcon } from 'lucide-react';
import { FileTextIcon, GiftIcon, HeadsetIcon } from 'lucide-react';

import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared/locale';

export type CustomerNavSlug = 'booking-requests' | 'gift-cards' | 'support-requests';

export type CustomerNavRoute = {
    slug: CustomerNavSlug;
    path: `/profile/${CustomerNavSlug}`;
    to: `/{-$locale}/profile/${CustomerNavSlug}`;
    title: (locale: Locale) => string;
    description: (locale: Locale) => string;
    icon: LucideIcon;
};

const NAV_TITLE_KEY = {
    'booking-requests': 'nav.bookingRequests.title',
    'gift-cards': 'nav.giftCards.title',
    'support-requests': 'nav.supportRequests.title',
} as const satisfies Record<CustomerNavSlug, ParseKeys<'profileCustomer'>>;

const NAV_DESCRIPTION_KEY = {
    'booking-requests': 'nav.bookingRequests.description',
    'gift-cards': 'nav.giftCards.description',
    'support-requests': 'nav.supportRequests.description',
} as const satisfies Record<CustomerNavSlug, ParseKeys<'profileCustomer'>>;

function customerNavTitle(slug: CustomerNavSlug) {
    return (locale: Locale) => t(locale, 'profileCustomer', NAV_TITLE_KEY[slug]);
}

function customerNavDescription(slug: CustomerNavSlug) {
    return (locale: Locale) => t(locale, 'profileCustomer', NAV_DESCRIPTION_KEY[slug]);
}

const bookingRequestsRoute: CustomerNavRoute = {
    slug: 'booking-requests',
    path: '/profile/booking-requests',
    to: '/{-$locale}/profile/booking-requests',
    title: customerNavTitle('booking-requests'),
    description: customerNavDescription('booking-requests'),
    icon: FileTextIcon,
};

const giftCardsRoute: CustomerNavRoute = {
    slug: 'gift-cards',
    path: '/profile/gift-cards',
    to: '/{-$locale}/profile/gift-cards',
    title: customerNavTitle('gift-cards'),
    description: customerNavDescription('gift-cards'),
    icon: GiftIcon,
};

const supportRequestsRoute: CustomerNavRoute = {
    slug: 'support-requests',
    path: '/profile/support-requests',
    to: '/{-$locale}/profile/support-requests',
    title: customerNavTitle('support-requests'),
    description: customerNavDescription('support-requests'),
    icon: HeadsetIcon,
};

const CUSTOMER_NAV_BY_SLUG: Record<CustomerNavSlug, CustomerNavRoute> = {
    'booking-requests': bookingRequestsRoute,
    'gift-cards': giftCardsRoute,
    'support-requests': supportRequestsRoute,
};

export const CUSTOMER_NAV_ROUTES: readonly CustomerNavRoute[] = [bookingRequestsRoute, giftCardsRoute, supportRequestsRoute];

export function customerNavRouteBySlug(slug: CustomerNavSlug): CustomerNavRoute {
    return CUSTOMER_NAV_BY_SLUG[slug];
}

export function customerNavRouteByPath(path: string): CustomerNavRoute | undefined {
    return CUSTOMER_NAV_ROUTES.find((entry) => entry.path === path);
}
