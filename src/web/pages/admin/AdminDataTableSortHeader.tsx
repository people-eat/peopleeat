import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../../components/base/button';

type SortableColumn = {
    getIsSorted: () => false | 'asc' | 'desc';
    toggleSorting: (desc?: boolean) => void;
};

export function AdminDataTableSortHeader({ column, children }: { column: SortableColumn; children: ReactNode }) {
    const sorted = column.getIsSorted();
    const Icon = sorted === 'asc' ? ArrowUpIcon : sorted === 'desc' ? ArrowDownIcon : ArrowUpDownIcon;

    return (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(sorted === 'asc')}>
            {children}
            <Icon data-icon="inline-end" />
        </Button>
    );
}
