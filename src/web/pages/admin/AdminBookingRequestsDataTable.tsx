import type { OnChangeFn, SortingState } from '@tanstack/react-table';

import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminBookingRequestsColumns } from './adminBookingRequestsColumns';
import type { AdminBookingRequestsTableRow } from './adminBookingRequestsColumns';
import { adminBookingRequestsDataTableFeatures } from './adminBookingRequestsDataTableFeatures';
import { AdminDataTable } from './AdminDataTable';

type AdminBookingRequestsDataTableProps = {
    data: AdminBookingRequestsTableRow[];
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
};

export function AdminBookingRequestsDataTable({ data, sorting, onSortingChange }: AdminBookingRequestsDataTableProps) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    return (
        <AdminDataTable
            features={adminBookingRequestsDataTableFeatures}
            columns={adminBookingRequestsColumns(locale, timeZone)}
            data={data}
            sorting={sorting}
            onSortingChange={onSortingChange}
            showPagination={false}
            getRowTo={(row) => ({
                to: '/{-$locale}/admin/booking-requests/$bookingRequestId',
                params: { bookingRequestId: row.bookingRequestId },
            })}
            emptyMessage={{ de: 'Keine Buchungsanfragen gefunden.', en: 'No booking requests found.' }[locale]}
        />
    );
}
