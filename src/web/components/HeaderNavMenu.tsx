import { Link } from '@tanstack/react-router';
import { LogInIcon, MenuIcon, UserIcon, UserStarIcon } from 'lucide-react';
import type { Locale } from '../../shared/locale';
import { useLocale } from '../hooks/useLocale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './base/dropdown-menu';
import type { PublicHeaderUser } from './Header';
import { HeaderButton } from './HeaderButton';
import { HEADER_NAV_ITEMS } from './HeaderNav';

export function HeaderNavMenu({ user, locale: localeProp }: { user: PublicHeaderUser; locale?: Locale }) {
    const routeLocale = useLocale();
    const locale = localeProp ?? routeLocale;
    const menuLabel = { de: 'Menü', en: 'Menu' }[locale];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <HeaderButton size="icon" className="@6xl:hidden" aria-label={menuLabel}>
                    <MenuIcon aria-hidden />
                </HeaderButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {HEADER_NAV_ITEMS.map((item) => (
                    <DropdownMenuItem key={item.to} asChild>
                        <Link to={item.to}>
                            <item.icon aria-hidden />
                            {item.label[locale]}
                        </Link>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {!user ? (
                    <DropdownMenuItem asChild>
                        <Link to="/{-$locale}/log-on">
                            <LogInIcon aria-hidden />
                            {{ de: 'Anmelden', en: 'Log on' }[locale]}
                        </Link>
                    </DropdownMenuItem>
                ) : (
                    <>
                        <DropdownMenuItem asChild>
                            <Link to="/{-$locale}/profile">
                                <UserIcon aria-hidden />
                                {{ de: 'Profil', en: 'Profile' }[locale]}
                            </Link>
                        </DropdownMenuItem>
                        {user.admin ? (
                            <DropdownMenuItem asChild>
                                <Link to="/{-$locale}/admin">
                                    <UserStarIcon aria-hidden />
                                    {{ de: 'Administration', en: 'Administration' }[locale]}
                                </Link>
                            </DropdownMenuItem>
                        ) : null}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
