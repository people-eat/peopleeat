import type { OnChangeFn, SortingState } from '@tanstack/react-table';

import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminAssistantChatsColumns } from './adminAssistantChatsColumns';
import type { AdminAssistantChatsTableRow } from './adminAssistantChatsColumns';
import { adminAssistantChatsDataTableFeatures } from './adminAssistantChatsDataTableFeatures';
import { AdminDataTable } from './AdminDataTable';

type AdminAssistantChatsDataTableProps = {
    data: AdminAssistantChatsTableRow[];
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
};

export function AdminAssistantChatsDataTable({ data, sorting, onSortingChange }: AdminAssistantChatsDataTableProps) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    return (
        <AdminDataTable
            features={adminAssistantChatsDataTableFeatures}
            columns={adminAssistantChatsColumns(locale, timeZone)}
            data={data}
            sorting={sorting}
            onSortingChange={onSortingChange}
            showPagination={false}
            getRowTo={(row) => ({
                to: '/{-$locale}/admin/assistant-chats/$chatId',
                params: { chatId: row.chatId },
            })}
            emptyMessage={{ de: 'Keine Assistent-Chats gefunden.', en: 'No assistant chats found.' }[locale]}
        />
    );
}
