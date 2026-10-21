import type { LucideIcon } from 'lucide-react';
import {
    BookOpenIcon,
    ChefHatIcon,
    EyeIcon,
    FileOutputIcon,
    MapPinIcon,
    PhoneIcon,
    RadarIcon,
    UtensilsIcon,
    WalletIcon,
} from 'lucide-react';

import type { Locale } from '../../utils/locale';

export type CookNavSlug =
    'booking-request-pool' | 'booking-request-offers' | 'chef-profile' | 'travel' | 'public' | 'meals' | 'menus' | 'wallet' | 'calls';

export type CookNavRoute = {
    slug: CookNavSlug;
    path: `/profile/${CookNavSlug}`;
    to: `/{-$locale}/profile/${CookNavSlug}`;
    title: Record<Locale, string>;
    description: Record<Locale, string>;
    icon: LucideIcon;
};

export const COOK_NAV_ROUTES: readonly CookNavRoute[] = [
    {
        slug: 'booking-request-pool',
        path: '/profile/booking-request-pool',
        to: '/{-$locale}/profile/booking-request-pool',
        title: { de: 'Anfragen-Pool', en: 'Booking request pool' },
        description: {
            de: 'Hier findest du Buchungsanfragen von Kunden innerhalb deines Reiseradius.',
            en: 'Here you can find booking requests within your travel radius.',
        },
        icon: RadarIcon,
    },
    {
        slug: 'booking-request-offers',
        path: '/profile/booking-request-offers',
        to: '/{-$locale}/profile/booking-request-offers',
        title: { de: 'Angebote', en: 'Sent offers' },
        description: { de: 'Deine Angebote auf Buchungsanfragen.', en: 'Your offers on booking requests.' },
        icon: FileOutputIcon,
    },
    {
        slug: 'chef-profile',
        path: '/profile/chef-profile',
        to: '/{-$locale}/profile/chef-profile',
        title: { de: 'Kochprofil', en: 'Chef profile' },
        description: {
            de: 'Biografie, Küchenstil und Kochphilosophie.',
            en: 'Biography, cuisine style, and cooking philosophy.',
        },
        icon: ChefHatIcon,
    },
    {
        slug: 'public',
        path: '/profile/public',
        to: '/{-$locale}/profile/public',
        title: { de: 'Öffentliches Profil', en: 'Public profile' },
        description: {
            de: 'Sichtbarkeit, Vorschau und Link zu deinem öffentlichen Kochprofil.',
            en: 'Visibility, preview, and link to your public chef profile.',
        },
        icon: EyeIcon,
    },
    {
        slug: 'travel',
        path: '/profile/travel',
        to: '/{-$locale}/profile/travel',
        title: { de: 'Reiseeinstellungen', en: 'Travel settings' },
        description: {
            de: 'Startadresse, Distanz und Reisekosten.',
            en: 'Travel origin, distance, and expenses.',
        },
        icon: MapPinIcon,
    },
    {
        slug: 'meals',
        path: '/profile/meals',
        to: '/{-$locale}/profile/meals',
        title: { de: 'Gerichte', en: 'Meals' },
        description: { de: 'Deine Gerichte verwalten.', en: 'Manage your meals.' },
        icon: UtensilsIcon,
    },
    {
        slug: 'menus',
        path: '/profile/menus',
        to: '/{-$locale}/profile/menus',
        title: { de: 'Menüs', en: 'Menus' },
        description: { de: 'Deine Menüs verwalten.', en: 'Manage your menus.' },
        icon: BookOpenIcon,
    },
    {
        slug: 'wallet',
        path: '/profile/wallet',
        to: '/{-$locale}/profile/wallet',
        title: { de: 'Wallet', en: 'Wallet' },
        description: {
            de: 'Stripe Connect Auszahlungen einrichten.',
            en: 'Set up Stripe Connect payouts.',
        },
        icon: WalletIcon,
    },
    {
        slug: 'calls',
        path: '/profile/calls',
        to: '/{-$locale}/profile/calls',
        title: { de: 'Gesprächstermine', en: 'Call appointments' },
        description: {
            de: 'Anrufplanung für Kennenlerngespräche.',
            en: 'Call scheduling for intro conversations.',
        },
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
