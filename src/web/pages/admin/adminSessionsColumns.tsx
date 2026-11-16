import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';

import { t } from '../../../i18n/t';
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
    isImpersonation: boolean;
};

export const ADMIN_SESSIONS_SORT_FIELDS = ['user', 'userAgent', 'lastInteractionAt'] as const;
export type AdminSessionsSortField = (typeof ADMIN_SESSIONS_SORT_FIELDS)[number];

const columnHelper = createColumnHelper<AdminSessionsDataTableFeatures, AdminSessionsTableRow>();

export function adminSessionsColumns(locale: Locale, timeZone: string) {
    const noUserAgent = t(locale, 'admin', 'copy.noUserAgent');
    const anonymousUser = t(locale, 'admin', 'copy.anonymous');
    const botLabel = t(locale, 'admin', 'copy.bot');
    const activeLabel = t(locale, 'admin', 'copy.active');
    const terminatedLabel = t(locale, 'admin', 'copy.terminated');
    const impersonationLabel = t(locale, 'admin', 'copy.impersonation');

    return columnHelper.columns([
        columnHelper.accessor((row) => (row.user ? userDisplayName(row.user) : ''), {
            id: 'user',
            header: ({ column }) => <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.user')}</AdminDataTableSortHeader>,
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
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.userAgent')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="line-clamp-2 text-muted-foreground">{row.original.userAgent ?? noUserAgent}</span>,
        }),
        columnHelper.accessor('isBot', {
            header: () => t(locale, 'admin', 'copy.status'),
            cell: ({ row }) => {
                const badges: string[] = [];
                if (row.original.isBot) badges.push(botLabel);
                if (row.original.isImpersonation) badges.push(impersonationLabel);
                if (row.original.connectionActive) badges.push(activeLabel);
                if (row.original.wasTerminatedAt) badges.push(terminatedLabel);

                if (badges.length === 0) {
                    return <span className="text-muted-foreground">-</span>;
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
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.lastActive')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(row.original.lastInteractionAt, { locale, timeZone, dateStyle: 'medium' })}
                </span>
            ),
        }),
    ]);
}
