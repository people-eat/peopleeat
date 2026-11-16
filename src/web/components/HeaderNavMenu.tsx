import { Link } from '@tanstack/react-router';
import { LogInIcon, MenuIcon, UserIcon, UserStarIcon } from 'lucide-react';
import { useSessionImpersonation } from '../hooks/useSessionImpersonation';
import { useT } from '../hooks/useT';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './base/dropdown-menu';
import type { PublicHeaderUser } from './Header';
import { HeaderButton } from './HeaderButton';
import { HEADER_NAV_ITEMS } from './HeaderNav';
import { SessionImpersonationReturnMenuItem } from './SessionImpersonationReturnButton';

export function HeaderNavMenu({ user }: { user: PublicHeaderUser; locale?: string }) {
    const { t } = useT('public');
    const { active: impersonating } = useSessionImpersonation();
    const menuLabel = t('nav.menu');

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
                            {t(item.labelKey)}
                        </Link>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {!user ? (
                    <DropdownMenuItem asChild>
                        <Link to="/{-$locale}/log-on">
                            <LogInIcon aria-hidden />
                            {t('nav.logOn')}
                        </Link>
                    </DropdownMenuItem>
                ) : (
                    <>
                        <DropdownMenuItem asChild>
                            <Link to="/{-$locale}/profile">
                                <UserIcon aria-hidden />
                                {t('nav.profile')}
                            </Link>
                        </DropdownMenuItem>
                        {impersonating ? (
                            <SessionImpersonationReturnMenuItem />
                        ) : user.admin ? (
                            <DropdownMenuItem asChild>
                                <Link to="/{-$locale}/admin">
                                    <UserStarIcon aria-hidden />
                                    {t('nav.administration')}
                                </Link>
                            </DropdownMenuItem>
                        ) : null}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
