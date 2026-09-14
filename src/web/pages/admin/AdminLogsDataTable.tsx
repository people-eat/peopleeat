import type { OnChangeFn, SortingState } from '@tanstack/react-table';

import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminDataTable } from './AdminDataTable';
import { adminLogsColumns } from './adminLogsColumns';
import type { AdminLogsTableRow } from './adminLogsColumns';
import { adminLogsDataTableFeatures } from './adminLogsDataTableFeatures';

type AdminLogsDataTableProps = {
    data: AdminLogsTableRow[];
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
};

export function AdminLogsDataTable({ data, sorting, onSortingChange }: AdminLogsDataTableProps) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    return (
        <AdminDataTable
            features={adminLogsDataTableFeatures}
            columns={adminLogsColumns(locale, timeZone)}
            data={data}
            sorting={sorting}
            onSortingChange={onSortingChange}
            showPagination={false}
            getRowTo={(row) => ({
                to: '/{-$locale}/admin/logs/$logId',
                params: { logId: row.logId },
            })}
            emptyMessage={{ de: 'Keine Log-Nachrichten gefunden.', en: 'No log messages found.' }[locale]}
        />
    );
}
