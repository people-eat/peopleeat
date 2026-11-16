import { Link } from '@tanstack/react-router';
import { UserIcon, UserStarIcon } from 'lucide-react';
import { useSessionImpersonation } from '../hooks/useSessionImpersonation';
import { useT } from '../hooks/useT';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';
import type { PublicHeaderUser } from './Header';
import { HeaderButton } from './HeaderButton';
import { SessionImpersonationReturnHeaderButton } from './SessionImpersonationReturnButton';

export function PublicSessionNav({ user }: { user: PublicHeaderUser; locale?: string }) {
    const { t } = useT('public');
    const { active: impersonating } = useSessionImpersonation();

    if (!user) {
        return (
            <HeaderButton asChild className="hidden @6xl:inline-flex">
                <Link to="/{-$locale}/log-on">{t('nav.logOn')}</Link>
            </HeaderButton>
        );
    }

    const administrationLabel = t('nav.administration');
    const profileLabel = t('nav.profile');

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
            {impersonating ? (
                <SessionImpersonationReturnHeaderButton />
            ) : user.admin ? (
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
