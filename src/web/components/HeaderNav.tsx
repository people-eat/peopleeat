import { Link } from '@tanstack/react-router';
import { ChefHatIcon, GiftIcon, InfoIcon } from 'lucide-react';
import type { Locale } from '../../shared/locale';
import { useLocale } from '../hooks/useLocale';

export const HEADER_NAV_ITEMS = [
    {
        to: '/{-$locale}/how-to-become-a-chef' as const,
        label: { de: 'Privatkoch werden', en: 'How to become a chef' },
        icon: ChefHatIcon,
    },
    {
        to: '/{-$locale}/gift-card' as const,
        label: { de: 'Geschenkkarte', en: 'Gift card' },
        icon: GiftIcon,
    },
    {
        to: '/{-$locale}/about-us' as const,
        label: { de: 'Über uns', en: 'About us' },
        icon: InfoIcon,
    },
] as const;

export function HeaderNav({ locale: localeProp }: { locale?: Locale }) {
    const routeLocale = useLocale();
    const locale = localeProp ?? routeLocale;

    return (
        <nav
            aria-label={{ de: 'Hauptnavigation', en: 'Main navigation' }[locale]}
            className="absolute left-1/2 hidden -translate-x-1/2 @6xl:block"
        >
            <ul className="flex items-center justify-evenly gap-8 rounded-lg bg-background/30 p-2 text-center backdrop-blur-lg">
                {HEADER_NAV_ITEMS.map((item) => (
                    <li key={item.to} className="rounded-lg text-gray-800 transition-colors hover:bg-secondary/50">
                        <Link
                            to={item.to}
                            className="block rounded-lg px-4 py-2 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                            {item.label[locale]}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
