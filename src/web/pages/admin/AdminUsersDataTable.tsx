import type { OnChangeFn, SortingState } from '@tanstack/react-table';

import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminDataTable } from './AdminDataTable';
import { adminUsersColumns } from './adminUsersColumns';
import type { AdminUsersTableRow } from './adminUsersColumns';
import { adminUsersDataTableFeatures } from './adminUsersDataTableFeatures';

type AdminUsersDataTableProps = {
    data: AdminUsersTableRow[];
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
};

export function AdminUsersDataTable({ data, sorting, onSortingChange }: AdminUsersDataTableProps) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    return (
        <AdminDataTable
            features={adminUsersDataTableFeatures}
            columns={adminUsersColumns(locale, timeZone)}
            data={data}
            sorting={sorting}
            onSortingChange={onSortingChange}
            showPagination={false}
            getRowTo={(row) => ({
                to: '/{-$locale}/admin/users/$userId',
                params: { userId: row.userId },
            })}
            emptyMessage={{ de: 'Keine Nutzer gefunden.', en: 'No users found.' }[locale]}
        />
    );
}
