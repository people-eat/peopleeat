import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';

import { t } from '../../../i18n/t';
import { formatDateTime, userDisplayName } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
import { statusBadgeToneClass } from '../../components/base/status';
import type { GqlCAdminLogLevel } from '../../graphql/generated';
import { AdminDataTableSortHeader } from './AdminDataTableSortHeader';
import type { AdminLogsDataTableFeatures } from './adminLogsDataTableFeatures';

export type AdminLogsTableRow = {
    logId: string;
    sessionId: string | null;
    session: {
        sessionId: string;
        user: { userId: string; firstName: string; lastName: string; emailAddress: string | null } | null;
    } | null;
    level: GqlCAdminLogLevel;
    message: string;
    createdAt: string;
};

export const ADMIN_LOGS_SORT_FIELDS = ['createdAt', 'message'] as const;
export type AdminLogsSortField = (typeof ADMIN_LOGS_SORT_FIELDS)[number];

const columnHelper = createColumnHelper<AdminLogsDataTableFeatures, AdminLogsTableRow>();

export function adminLogLevelLabel(level: GqlCAdminLogLevel, locale: Locale) {
    return t(locale, 'admin', `logs.levels.${level}`);
}

export function adminLogLevelBadgeClassName(level: GqlCAdminLogLevel) {
    switch (level) {
        case 'error':
            return statusBadgeToneClass.error;
        case 'warn':
            return statusBadgeToneClass.warning;
        case 'info':
            return statusBadgeToneClass.info;
        case 'debug':
            return 'border-border bg-muted text-foreground';
    }
}

function formatLogCreatedAt(value: string, locale: Locale, timeZone: string) {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short' });
}

export function adminLogsColumns(locale: Locale, timeZone: string) {
    const empty = t(locale, 'admin', 'copy.empty');
    const anonymous = t(locale, 'admin', 'copy.anonymous');

    return columnHelper.columns([
        columnHelper.accessor('createdAt', {
            header: ({ column }) => <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.time2')}</AdminDataTableSortHeader>,
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatLogCreatedAt(row.original.createdAt, locale, timeZone)}
                </span>
            ),
        }),
        columnHelper.accessor('level', {
            header: () => t(locale, 'admin', 'copy.level'),
            cell: ({ row }) => (
                <Badge variant="outline" className={adminLogLevelBadgeClassName(row.original.level)}>
                    {adminLogLevelLabel(row.original.level, locale)}
                </Badge>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('message', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.message')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="line-clamp-3 font-medium text-foreground">{row.original.message}</span>,
        }),
        columnHelper.accessor((row) => (row.session?.user ? userDisplayName(row.session.user) : ''), {
            id: 'user',
            header: () => t(locale, 'admin', 'copy.user'),
            cell: ({ row }) => {
                const user = row.original.session?.user;
                if (user) {
                    return (
                        <div className="grid gap-0.5">
                            <Link
                                to="/{-$locale}/admin/users/$userId"
                                params={{ userId: user.userId }}
                                className="font-medium text-foreground hover:underline"
                            >
                                {userDisplayName(user)}
                            </Link>
                            <span className="text-xs text-muted-foreground">{user.emailAddress ?? '—'}</span>
                        </div>
                    );
                }
                if (row.original.sessionId) {
                    return <span className="text-muted-foreground">{anonymous}</span>;
                }
                return <span className="text-muted-foreground">{empty}</span>;
            },
            enableSorting: false,
        }),
    ]);
}
