import type { OnChangeFn, SortingState } from '@tanstack/react-table';

import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminAiGenerationsColumns } from './adminAiGenerationsColumns';
import type { AdminAiGenerationsTableRow } from './adminAiGenerationsColumns';
import { adminAiGenerationsDataTableFeatures } from './adminAiGenerationsDataTableFeatures';
import { AdminDataTable } from './AdminDataTable';

type AdminAiGenerationsDataTableProps = {
    data: AdminAiGenerationsTableRow[];
    page: number;
    pageCount: number;
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
    onPageChange: (page: number) => void;
};

export function AdminAiGenerationsDataTable({
    data,
    page,
    pageCount,
    sorting,
    onSortingChange,
    onPageChange,
}: AdminAiGenerationsDataTableProps) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    return (
        <AdminDataTable
            features={adminAiGenerationsDataTableFeatures}
            columns={adminAiGenerationsColumns(locale, timeZone)}
            data={data}
            page={page}
            pageCount={pageCount}
            sorting={sorting}
            onSortingChange={onSortingChange}
            onPageChange={onPageChange}
            getRowTo={(row) => ({
                to: '/{-$locale}/admin/ai-generations/$aiGenerationId',
                params: { aiGenerationId: row.aiGenerationId },
            })}
            emptyMessage={{ de: 'Keine AI-Generierungen gefunden.', en: 'No AI generations found.' }[locale]}
        />
    );
}
