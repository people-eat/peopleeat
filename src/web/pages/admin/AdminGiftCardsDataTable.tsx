import type { OnChangeFn, SortingState } from '@tanstack/react-table';

import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminDataTable } from './AdminDataTable';
import { adminGiftCardsColumns } from './adminGiftCardsColumns';
import type { AdminGiftCardsTableRow } from './adminGiftCardsColumns';
import { adminGiftCardsDataTableFeatures } from './adminGiftCardsDataTableFeatures';

type AdminGiftCardsDataTableProps = {
    data: AdminGiftCardsTableRow[];
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
};

export function AdminGiftCardsDataTable({ data, sorting, onSortingChange }: AdminGiftCardsDataTableProps) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    return (
        <AdminDataTable
            features={adminGiftCardsDataTableFeatures}
            columns={adminGiftCardsColumns(locale, timeZone)}
            data={data}
            sorting={sorting}
            onSortingChange={onSortingChange}
            showPagination={false}
            getRowTo={(row) => ({
                to: '/{-$locale}/admin/gift-cards/$giftCardId',
                params: { giftCardId: row.giftCardId },
            })}
            emptyMessage={{ de: 'Keine Gutscheine gefunden.', en: 'No gift cards found.' }[locale]}
        />
    );
}
