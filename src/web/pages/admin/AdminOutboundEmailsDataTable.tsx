import type { OnChangeFn, SortingState } from '@tanstack/react-table';

import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminDataTable } from './AdminDataTable';
import { adminOutboundEmailsColumns } from './adminOutboundEmailsColumns';
import type { AdminOutboundEmailsTableRow } from './adminOutboundEmailsColumns';
import { adminOutboundEmailsDataTableFeatures } from './adminOutboundEmailsDataTableFeatures';

type AdminOutboundEmailsDataTableProps = {
    data: AdminOutboundEmailsTableRow[];
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
};

export function AdminOutboundEmailsDataTable({ data, sorting, onSortingChange }: AdminOutboundEmailsDataTableProps) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    return (
        <AdminDataTable
            features={adminOutboundEmailsDataTableFeatures}
            columns={adminOutboundEmailsColumns(locale, timeZone)}
            data={data}
            sorting={sorting}
            onSortingChange={onSortingChange}
            showPagination={false}
            getRowTo={(row) => ({
                to: '/{-$locale}/admin/outbound-emails/$outboundEmailId',
                params: { outboundEmailId: row.outboundEmailId },
            })}
            emptyMessage={{ de: 'Keine E-Mails gefunden.', en: 'No emails found.' }[locale]}
        />
    );
}
