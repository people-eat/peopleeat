import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';

import { formatDateTime, userDisplayName } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
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
    return {
        error: { de: 'Fehler', en: 'Error' },
        warn: { de: 'Warnung', en: 'Warn' },
        info: { de: 'Info', en: 'Info' },
        debug: { de: 'Debug', en: 'Debug' },
    }[level][locale];
}

function adminLogLevelBadgeVariant(level: GqlCAdminLogLevel): 'destructive' | 'outline' | 'secondary' {
    switch (level) {
        case 'error':
            return 'destructive';
        case 'warn':
            return 'outline';
        default:
            return 'secondary';
    }
}

function formatLogCreatedAt(value: string, locale: Locale, timeZone: string) {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short' });
}

export function adminLogsColumns(locale: Locale, timeZone: string) {
    const empty = { de: '—', en: '—' }[locale];
    const anonymous = { de: 'Anonym', en: 'Anonymous' }[locale];

    return columnHelper.columns([
        columnHelper.accessor('createdAt', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Zeit', en: 'Time' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatLogCreatedAt(row.original.createdAt, locale, timeZone)}
                </span>
            ),
        }),
        columnHelper.accessor('level', {
            header: () => ({ de: 'Level', en: 'Level' })[locale],
            cell: ({ row }) => (
                <Badge variant={adminLogLevelBadgeVariant(row.original.level)}>{adminLogLevelLabel(row.original.level, locale)}</Badge>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('message', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Nachricht', en: 'Message' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => <span className="line-clamp-3 font-medium text-foreground">{row.original.message}</span>,
        }),
        columnHelper.accessor((row) => (row.session?.user ? userDisplayName(row.session.user) : ''), {
            id: 'user',
            header: () => ({ de: 'Nutzer', en: 'User' })[locale],
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
