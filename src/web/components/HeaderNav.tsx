import { Link } from '@tanstack/react-router';
import { ChefHatIcon, GiftIcon, InfoIcon } from 'lucide-react';
import { useT } from '../hooks/useT';

export const HEADER_NAV_ITEMS = [
    {
        to: '/{-$locale}/how-to-become-a-chef' as const,
        labelKey: 'nav.becomeChef' as const,
        icon: ChefHatIcon,
    },
    {
        to: '/{-$locale}/gift-card' as const,
        labelKey: 'nav.giftCard' as const,
        icon: GiftIcon,
    },
    {
        to: '/{-$locale}/about-us' as const,
        labelKey: 'nav.aboutUs' as const,
        icon: InfoIcon,
    },
] as const;

export function HeaderNav(_props: { locale?: string } = {}) {
    const { t } = useT('public');

    return (
        <nav aria-label={t('nav.main')} className="absolute left-1/2 hidden -translate-x-1/2 @6xl:block">
            <ul className="flex items-center justify-evenly gap-8 rounded-lg bg-background/30 p-2 text-center backdrop-blur-lg">
                {HEADER_NAV_ITEMS.map((item) => (
                    <li key={item.to} className="rounded-lg text-gray-800 transition-colors hover:bg-secondary/50">
                        <Link
                            to={item.to}
                            className="block rounded-lg px-4 py-2 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                            {t(item.labelKey)}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
