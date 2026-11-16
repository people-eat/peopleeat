import type { LucideIcon } from 'lucide-react';
import {
    BarChart3Icon,
    BookOpenIcon,
    ChefHatIcon,
    EyeIcon,
    FileOutputIcon,
    MapPinIcon,
    PackagePlusIcon,
    PhoneIcon,
    RadarIcon,
    UserPlusIcon,
    UtensilsIcon,
    WalletIcon,
} from 'lucide-react';

import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared/locale';

export type CookNavSlug =
    | 'booking-request-pool'
    | 'booking-request-offers'
    | 'analytics'
    | 'invite'
    | 'chef-profile'
    | 'travel'
    | 'public'
    | 'meals'
    | 'menus'
    | 'offer-addons'
    | 'wallet'
    | 'calls';

export type CookNavRoute = {
    slug: CookNavSlug;
    path: `/profile/${CookNavSlug}`;
    to: `/{-$locale}/profile/${CookNavSlug}`;
    title: (locale: Locale) => string;
    description: (locale: Locale) => string;
    icon: LucideIcon;
};

const NAV_KEY: Record<CookNavSlug, string> = {
    'booking-request-pool': 'bookingRequestPool',
    'booking-request-offers': 'bookingRequestOffers',
    analytics: 'analytics',
    invite: 'invite',
    'chef-profile': 'chefProfile',
    travel: 'travel',
    public: 'public',
    meals: 'meals',
    menus: 'menus',
    'offer-addons': 'offerAddons',
    wallet: 'wallet',
    calls: 'calls',
};

function cookNavTitle(slug: CookNavSlug) {
    return (locale: Locale) => t(locale, 'profileCook', `nav.${NAV_KEY[slug]}.title`);
}

function cookNavDescription(slug: CookNavSlug) {
    return (locale: Locale) => t(locale, 'profileCook', `nav.${NAV_KEY[slug]}.description`);
}

export const COOK_NAV_ROUTES: readonly CookNavRoute[] = [
    {
        slug: 'booking-request-pool',
        path: '/profile/booking-request-pool',
        to: '/{-$locale}/profile/booking-request-pool',
        title: cookNavTitle('booking-request-pool'),
        description: cookNavDescription('booking-request-pool'),
        icon: RadarIcon,
    },
    {
        slug: 'booking-request-offers',
        path: '/profile/booking-request-offers',
        to: '/{-$locale}/profile/booking-request-offers',
        title: cookNavTitle('booking-request-offers'),
        description: cookNavDescription('booking-request-offers'),
        icon: FileOutputIcon,
    },
    {
        slug: 'analytics',
        path: '/profile/analytics',
        to: '/{-$locale}/profile/analytics',
        title: cookNavTitle('analytics'),
        description: cookNavDescription('analytics'),
        icon: BarChart3Icon,
    },
    {
        slug: 'invite',
        path: '/profile/invite',
        to: '/{-$locale}/profile/invite',
        title: cookNavTitle('invite'),
        description: cookNavDescription('invite'),
        icon: UserPlusIcon,
    },
    {
        slug: 'chef-profile',
        path: '/profile/chef-profile',
        to: '/{-$locale}/profile/chef-profile',
        title: cookNavTitle('chef-profile'),
        description: cookNavDescription('chef-profile'),
        icon: ChefHatIcon,
    },
    {
        slug: 'public',
        path: '/profile/public',
        to: '/{-$locale}/profile/public',
        title: cookNavTitle('public'),
        description: cookNavDescription('public'),
        icon: EyeIcon,
    },
    {
        slug: 'travel',
        path: '/profile/travel',
        to: '/{-$locale}/profile/travel',
        title: cookNavTitle('travel'),
        description: cookNavDescription('travel'),
        icon: MapPinIcon,
    },
    {
        slug: 'meals',
        path: '/profile/meals',
        to: '/{-$locale}/profile/meals',
        title: cookNavTitle('meals'),
        description: cookNavDescription('meals'),
        icon: UtensilsIcon,
    },
    {
        slug: 'menus',
        path: '/profile/menus',
        to: '/{-$locale}/profile/menus',
        title: cookNavTitle('menus'),
        description: cookNavDescription('menus'),
        icon: BookOpenIcon,
    },
    {
        slug: 'offer-addons',
        path: '/profile/offer-addons',
        to: '/{-$locale}/profile/offer-addons',
        title: cookNavTitle('offer-addons'),
        description: cookNavDescription('offer-addons'),
        icon: PackagePlusIcon,
    },
    {
        slug: 'wallet',
        path: '/profile/wallet',
        to: '/{-$locale}/profile/wallet',
        title: cookNavTitle('wallet'),
        description: cookNavDescription('wallet'),
        icon: WalletIcon,
    },
    {
        slug: 'calls',
        path: '/profile/calls',
        to: '/{-$locale}/profile/calls',
        title: cookNavTitle('calls'),
        description: cookNavDescription('calls'),
        icon: PhoneIcon,
    },
];

export function cookNavRouteBySlug(slug: CookNavSlug): CookNavRoute {
    const route = COOK_NAV_ROUTES.find((entry) => entry.slug === slug);
    if (!route) {
        throw new Error(`Unknown cook nav slug: ${slug}`);
    }
    return route;
}

export function cookStubRouteBySlug(slug: CookNavSlug): CookNavRoute {
    return cookNavRouteBySlug(slug);
}

export function cookNavRouteByPath(path: string): CookNavRoute | undefined {
    return COOK_NAV_ROUTES.find((entry) => entry.path === path);
}
