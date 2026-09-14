import { Link } from '@tanstack/react-router';
import { UserIcon, UserStarIcon } from 'lucide-react';
import type { Locale } from '../../shared/locale';
import { useLocale } from '../hooks/useLocale';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';
import type { PublicHeaderUser } from './Header';
import { HeaderButton } from './HeaderButton';

export function PublicSessionNav({ user, locale: localeProp }: { user: PublicHeaderUser; locale?: Locale }) {
    const routeLocale = useLocale();
    const locale = localeProp ?? routeLocale;

    if (!user) {
        return (
            <HeaderButton asChild className="hidden @6xl:inline-flex">
                <Link to="/{-$locale}/log-on">{{ de: 'Anmelden', en: 'Log on' }[locale]}</Link>
            </HeaderButton>
        );
    }

    const administrationLabel = { de: 'Administration', en: 'Administration' }[locale];
    const profileLabel = { de: 'Profil', en: 'Profile' }[locale];

    return (
        <div className="hidden items-center gap-4 @6xl:flex">
            <Tooltip>
                <TooltipTrigger asChild>
                    <HeaderButton asChild size="icon" aria-label={profileLabel}>
                        <Link to="/{-$locale}/profile">
                            <UserIcon aria-hidden />
                        </Link>
                    </HeaderButton>
                </TooltipTrigger>
                <TooltipContent>{profileLabel}</TooltipContent>
            </Tooltip>
            {user.admin ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <HeaderButton asChild size="icon" aria-label={administrationLabel}>
                            <Link to="/{-$locale}/admin">
                                <UserStarIcon aria-hidden />
                            </Link>
                        </HeaderButton>
                    </TooltipTrigger>
                    <TooltipContent>{administrationLabel}</TooltipContent>
                </Tooltip>
            ) : null}
        </div>
    );
}
