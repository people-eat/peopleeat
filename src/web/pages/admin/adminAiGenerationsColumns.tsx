import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';

import { t } from '../../../i18n/t';
import { formatDateTime, userDisplayName } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
import type { GqlCAdminAiGenerationKind } from '../../graphql/generated';
import type { AdminAiGenerationsDataTableFeatures } from './adminAiGenerationsDataTableFeatures';
import { AdminDataTableSortHeader } from './AdminDataTableSortHeader';

export type AdminAiGenerationsTableRow = {
    aiGenerationId: string;
    kind: GqlCAdminAiGenerationKind;
    userId: string | null;
    user: { userId: string; firstName: string; lastName: string; emailAddress: string | null } | null;
    modelId: string | null;
    totalTokens: number | null;
    createdAt: string;
};

export const ADMIN_AI_GENERATIONS_SORT_FIELDS = ['createdAt', 'kind', 'modelId', 'totalTokens'] as const;
export type AdminAiGenerationsSortField = (typeof ADMIN_AI_GENERATIONS_SORT_FIELDS)[number];

export const ADMIN_AI_GENERATION_KINDS: GqlCAdminAiGenerationKind[] = [
    'COOK_MENU_SUGGESTION_FROM_TEXT',
    'COOK_MENU_SUGGESTION_FROM_INVENTORY',
    'COOK_MENU_TITLE_DESCRIPTION',
    'CHAT_TITLE',
    'BOOKING_REQUEST_OFFER_CALL_RECORDING_TRANSCRIPT',
    'BOOKING_REQUEST_OFFER_CALL_RECORDING_SUMMARY',
    'COOK_BIOGRAPHY_SUGGESTION',
    'COOK_BIOGRAPHY_SUMMARY',
    'BOOKING_REQUEST_COOK_MENU_EVALUATION',
    'BOOKING_REQUEST_ADJUSTED_MESSAGE',
    'WEB_PAGE_SEO_TRANSLATE',
];

const columnHelper = createColumnHelper<AdminAiGenerationsDataTableFeatures, AdminAiGenerationsTableRow>();

export function adminAiGenerationKindLabel(kind: GqlCAdminAiGenerationKind, locale: Locale) {
    return t(locale, 'admin', `aiGenerations.kinds.${kind}`);
}

function formatCreatedAt(value: string, locale: Locale, timeZone: string) {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short' });
}

export function adminAiGenerationsColumns(locale: Locale, timeZone: string) {
    const empty = t(locale, 'admin', 'copy.empty');

    return columnHelper.columns([
        columnHelper.accessor('createdAt', {
            header: ({ column }) => <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.time2')}</AdminDataTableSortHeader>,
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatCreatedAt(row.original.createdAt, locale, timeZone)}
                </span>
            ),
        }),
        columnHelper.accessor('kind', {
            header: ({ column }) => <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.kind')}</AdminDataTableSortHeader>,
            cell: ({ row }) => <Badge variant="secondary">{adminAiGenerationKindLabel(row.original.kind, locale)}</Badge>,
        }),
        columnHelper.accessor('modelId', {
            header: ({ column }) => <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.model')}</AdminDataTableSortHeader>,
            cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.modelId ?? empty}</span>,
        }),
        columnHelper.accessor('totalTokens', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{t(locale, 'admin', 'copy.tokens')}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="tabular-nums text-muted-foreground">
                    {row.original.totalTokens != null ? row.original.totalTokens.toLocaleString() : empty}
                </span>
            ),
        }),
        columnHelper.accessor((row) => (row.user ? userDisplayName(row.user) : ''), {
            id: 'user',
            header: () => t(locale, 'admin', 'copy.user'),
            cell: ({ row }) => {
                const user = row.original.user;
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
                return <span className="text-muted-foreground">{empty}</span>;
            },
            enableSorting: false,
        }),
    ]);
}
