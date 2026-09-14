import type { OnChangeFn, SortingState } from '@tanstack/react-table';

import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminCallsColumns } from './adminCallsColumns';
import type { AdminCallsTableRow } from './adminCallsColumns';
import { adminCallsDataTableFeatures } from './adminCallsDataTableFeatures';
import { AdminDataTable } from './AdminDataTable';

type AdminCallsDataTableProps = {
    data: AdminCallsTableRow[];
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
};

export function AdminCallsDataTable({ data, sorting, onSortingChange }: AdminCallsDataTableProps) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    return (
        <AdminDataTable
            features={adminCallsDataTableFeatures}
            columns={adminCallsColumns(locale, timeZone)}
            data={data}
            sorting={sorting}
            onSortingChange={onSortingChange}
            showPagination={false}
            getRowTo={(row) => ({
                to: '/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
                params: {
                    bookingRequestId: row.bookingRequestId,
                    bookingRequestOfferId: row.bookingRequestOfferId,
                },
            })}
            emptyMessage={{ de: 'Kein Anruf-Verkehr gefunden.', en: 'No call traffic found.' }[locale]}
        />
    );
}
