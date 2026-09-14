import type { OnChangeFn, SortingState } from '@tanstack/react-table';

import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminDataTable } from './AdminDataTable';
import { adminSessionsColumns } from './adminSessionsColumns';
import type { AdminSessionsTableRow } from './adminSessionsColumns';
import { adminSessionsDataTableFeatures } from './adminSessionsDataTableFeatures';

type AdminSessionsDataTableProps = {
    data: AdminSessionsTableRow[];
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
};

export function AdminSessionsDataTable({ data, sorting, onSortingChange }: AdminSessionsDataTableProps) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    return (
        <AdminDataTable
            features={adminSessionsDataTableFeatures}
            columns={adminSessionsColumns(locale, timeZone)}
            data={data}
            sorting={sorting}
            onSortingChange={onSortingChange}
            showPagination={false}
            getRowTo={(row) => ({
                to: '/{-$locale}/admin/sessions/$sessionId',
                params: { sessionId: row.sessionId },
            })}
            emptyMessage={{ de: 'Keine Sitzungen gefunden.', en: 'No sessions found.' }[locale]}
        />
    );
}
