import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';

import { t } from '../../../i18n/t';
import { formatDate, userDisplayName } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
import type { GqlCChatSurface } from '../../graphql/generated';
import { adminAssistantChatTitle, adminChatSurfaceLabel } from './adminAssistantChats';
import type { AdminAssistantChatsDataTableFeatures } from './adminAssistantChatsDataTableFeatures';

export type AdminAssistantChatsTableRow = {
    chatId: string;
    user: { userId: string; firstName: string; lastName: string };
    surface: GqlCChatSurface;
    title: string;
    lastModifiedAt: string;
    deletedAt?: string | null;
};

const columnHelper = createColumnHelper<AdminAssistantChatsDataTableFeatures, AdminAssistantChatsTableRow>();

export function adminAssistantChatsColumns(locale: Locale, timeZone: string) {
    return columnHelper.columns([
        columnHelper.accessor((row) => userDisplayName(row.user), {
            id: 'user',
            header: () => t(locale, 'admin', 'copy.user'),
            cell: ({ row }) => {
                const user = row.original.user;
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
            enableSorting: false,
        }),
        columnHelper.accessor((row) => adminAssistantChatTitle(row.title, locale), {
            id: 'title',
            header: () => t(locale, 'admin', 'copy.title'),
            cell: ({ row }) => (
                <div className="flex min-w-0 flex-col gap-1">
                    <span className="line-clamp-2 font-medium text-foreground">{adminAssistantChatTitle(row.original.title, locale)}</span>
                    {row.original.deletedAt ? <Badge variant="outline">{t(locale, 'admin', 'copy.deleted')}</Badge> : null}
                </div>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('surface', {
            header: () => t(locale, 'admin', 'copy.surface'),
            cell: ({ row }) => <Badge variant="secondary">{adminChatSurfaceLabel(row.original.surface, locale)}</Badge>,
            enableSorting: false,
        }),
        columnHelper.accessor('lastModifiedAt', {
            header: () => t(locale, 'admin', 'copy.lastModified'),
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {formatDate(row.original.lastModifiedAt, { locale, timeZone, dateStyle: 'medium' })}
                </span>
            ),
            enableSorting: false,
        }),
    ]);
}
