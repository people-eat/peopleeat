import { Link } from '@tanstack/react-router';
import { MailIcon } from 'lucide-react';

import { formatDate, userDisplayName } from '../../shared';
import type { Locale } from '../../shared/locale';
import type { GqlCAdminUserType, GqlCUserStatus } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { adminUserStatusLabel, adminUserTypeLabel } from '../pages/admin/adminUsersColumns';
import { cn } from '../utils/cn';
import { Avatar, AvatarFallback } from './base/avatar';
import { Badge } from './base/badge';
import { bookingRequestCardInteractionClassName } from './bookingRequestCardInteraction';

export type AdminUserListCardUser = {
    userId: string;
    firstName: string;
    lastName: string;
    emailAddress: string | null;
    status: GqlCUserStatus;
    types: GqlCAdminUserType[];
    createdAt: string;
};

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

function typeBadges(types: readonly GqlCAdminUserType[], locale: Locale) {
    return types.map((type) => (
        <Badge key={type} variant="secondary">
            {adminUserTypeLabel(type, locale)}
        </Badge>
    ));
}

export function AdminUserListCard({ user }: { user: AdminUserListCardUser }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const name = userDisplayName(user);
    const createdLabel = {
        de: `Registriert ${formatDate(user.createdAt, { locale, timeZone, dateStyle: 'medium' })}`,
        en: `Joined ${formatDate(user.createdAt, { locale, timeZone, dateStyle: 'medium' })}`,
    }[locale];

    return (
        <article
            className={cn(
                'flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm',
                bookingRequestCardInteractionClassName,
            )}
        >
            <div className="flex items-start gap-3">
                <Avatar className="size-10 shrink-0">
                    <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <Link
                            to="/{-$locale}/admin/users/$userId"
                            params={{ userId: user.userId }}
                            className="min-w-0 flex-1 line-clamp-1 font-semibold leading-snug hover:underline"
                        >
                            {name}
                        </Link>
                        <Badge variant={user.status === 'ACTIVE' ? 'secondary' : 'destructive'} className="shrink-0">
                            {adminUserStatusLabel(user.status, locale)}
                        </Badge>
                    </div>
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                        <MailIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
                        <span className="truncate">{user.emailAddress ?? { de: 'Keine E-Mail', en: 'No email' }[locale]}</span>
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap gap-1">{typeBadges(user.types, locale)}</div>
            <p className="mt-auto text-xs text-muted-foreground">{createdLabel}</p>
        </article>
    );
}
