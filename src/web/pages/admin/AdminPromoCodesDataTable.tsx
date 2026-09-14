import type { OnChangeFn, SortingState } from '@tanstack/react-table';

import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminDataTable } from './AdminDataTable';
import { adminPromoCodesColumns } from './adminPromoCodesColumns';
import type { AdminPromoCodesTableRow } from './adminPromoCodesColumns';
import { adminPromoCodesDataTableFeatures } from './adminPromoCodesDataTableFeatures';

type AdminPromoCodesDataTableProps = {
    data: AdminPromoCodesTableRow[];
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
};

export function AdminPromoCodesDataTable({ data, sorting, onSortingChange }: AdminPromoCodesDataTableProps) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    return (
        <AdminDataTable
            features={adminPromoCodesDataTableFeatures}
            columns={adminPromoCodesColumns(locale, timeZone)}
            data={data}
            sorting={sorting}
            onSortingChange={onSortingChange}
            showPagination={false}
            getRowTo={(row) => ({
                to: '/{-$locale}/admin/promo-codes/$promoCodeId',
                params: { promoCodeId: row.promoCodeId },
            })}
            emptyMessage={{ de: 'Keine Promo-Codes gefunden.', en: 'No promo codes found.' }[locale]}
        />
    );
}
