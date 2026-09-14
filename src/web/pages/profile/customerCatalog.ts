import type { LucideIcon } from 'lucide-react';
import { FileTextIcon, GiftIcon, HeadsetIcon } from 'lucide-react';

import type { Locale } from '../../utils/locale';

export type CustomerNavSlug = 'booking-requests' | 'gift-cards' | 'support-requests';

export type CustomerNavRoute = {
    slug: CustomerNavSlug;
    path: `/profile/${CustomerNavSlug}`;
    to: `/{-$locale}/profile/${CustomerNavSlug}`;
    title: Record<Locale, string>;
    description: Record<Locale, string>;
    icon: LucideIcon;
};

const bookingRequestsRoute: CustomerNavRoute = {
    slug: 'booking-requests',
    path: '/profile/booking-requests',
    to: '/{-$locale}/profile/booking-requests',
    title: { de: 'Buchungsanfragen', en: 'Booking requests' },
    description: {
        de: 'Deine gesendeten Buchungsanfragen.',
        en: 'Your sent booking requests.',
    },
    icon: FileTextIcon,
};

const giftCardsRoute: CustomerNavRoute = {
    slug: 'gift-cards',
    path: '/profile/gift-cards',
    to: '/{-$locale}/profile/gift-cards',
    title: { de: 'Geschenkkarten', en: 'Gift cards' },
    description: {
        de: 'Verschenke peopleeat und verwalte deine Käufe.',
        en: 'Gift peopleeat and manage your purchases.',
    },
    icon: GiftIcon,
};

const supportRequestsRoute: CustomerNavRoute = {
    slug: 'support-requests',
    path: '/profile/support-requests',
    to: '/{-$locale}/profile/support-requests',
    title: { de: 'Support', en: 'Support' },
    description: {
        de: 'Deine Support-Anfragen an peopleeat.',
        en: 'Your support requests to peopleeat.',
    },
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
