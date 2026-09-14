import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';

import { formatDate, userDisplayName } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
import { AdminDataTableSortHeader } from './AdminDataTableSortHeader';
import type { AdminSessionsDataTableFeatures } from './adminSessionsDataTableFeatures';

export type AdminSessionsTableRow = {
    sessionId: string;
    user: { userId: string; firstName: string; lastName: string } | null;
    lastInteractionAt: string;
    wasTerminatedAt: string | null;
    connectionActive: boolean;
    userAgent: string | null;
    isBot: boolean;
};

export const ADMIN_SESSIONS_SORT_FIELDS = ['user', 'userAgent', 'lastInteractionAt'] as const;
export type AdminSessionsSortField = (typeof ADMIN_SESSIONS_SORT_FIELDS)[number];

const columnHelper = createColumnHelper<AdminSessionsDataTableFeatures, AdminSessionsTableRow>();

export function adminSessionsColumns(locale: Locale, timeZone: string) {
    const noUserAgent = { de: 'Kein User-Agent', en: 'No user agent' }[locale];
    const anonymousUser = { de: 'Anonym', en: 'Anonymous' }[locale];
    const botLabel = { de: 'Bot', en: 'Bot' }[locale];
    const activeLabel = { de: 'Aktiv', en: 'Active' }[locale];
    const terminatedLabel = { de: 'Beendet', en: 'Terminated' }[locale];

    return columnHelper.columns([
        columnHelper.accessor((row) => (row.user ? userDisplayName(row.user) : ''), {
            id: 'user',
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Nutzer', en: 'User' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => {
                const user = row.original.user;
                if (!user) {
                    return <span className="text-muted-foreground">{anonymousUser}</span>;
                }

                return (
                    <Link
                        to="/{-$locale}/admin/users/$userId"
                        params={{ userId: user.userId }}
                        className="font-medium text-foreground hover:underline"
                    >
                        {userDisplayName(user)}
                    </Link>
                );
            },
        }),
        columnHelper.accessor('userAgent', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'User-Agent', en: 'User agent' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="line-clamp-2 text-muted-foreground">{row.original.userAgent ?? noUserAgent}</span>,
        }),
        columnHelper.accessor('isBot', {
            header: () => ({ de: 'Status', en: 'Status' })[locale],
            cell: ({ row }) => {
                const badges: string[] = [];
                if (row.original.isBot) badges.push(botLabel);
                if (row.original.connectionActive) badges.push(activeLabel);
                if (row.original.wasTerminatedAt) badges.push(terminatedLabel);

                if (badges.length === 0) {
                    return <span className="text-muted-foreground">—</span>;
                }

                return (
                    <div className="flex flex-wrap gap-1">
                        {badges.map((label) => (
                            <Badge key={label} variant="secondary">
                                {label}
                            </Badge>
                        ))}
                    </div>
                );
            },
            enableSorting: false,
        }),
        columnHelper.accessor('lastInteractionAt', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Zuletzt aktiv', en: 'Last active' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(row.original.lastInteractionAt, { locale, timeZone, dateStyle: 'medium' })}
                </span>
            ),
        }),
    ]);
}
