import { Link, useNavigate } from '@tanstack/react-router';
import { useTable } from '@tanstack/react-table';
import type { OnChangeFn, RowData, SortingState } from '@tanstack/react-table';
import { ChevronRightIcon } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';

import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '../../components/base/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/base/table';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';

type AdminDataTableRowLink = {
    to: string;
    params?: Record<string, string>;
};

const stickyOpenClassName = cn(
    'sticky right-0 z-10 w-10 bg-secondary pl-2 shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)]',
    'group-hover:bg-muted/50',
);

type AdminDataTableProps<TData extends RowData> = {
    // Concrete feature objects differ per table; useTable validates them at each call site's wrapper.
    features: any;
    columns: any[];
    data: TData[];
    page?: number;
    pageCount?: number;
    sorting: SortingState;
    onSortingChange: OnChangeFn<SortingState>;
    onPageChange?: (page: number) => void;
    /** When false, omit in-table pagination (use a pinned list bar instead). Default true when page controls are provided. */
    showPagination?: boolean;
    /** When omitted, rows are not clickable and the sticky open column is hidden. */
    getRowTo?: (row: TData) => AdminDataTableRowLink;
    emptyMessage: ReactNode;
};

export function AdminDataTable<TData extends RowData>({
    features,
    columns,
    data,
    page = 1,
    pageCount = 1,
    sorting,
    onSortingChange,
    onPageChange,
    showPagination,
    getRowTo,
    emptyMessage,
}: AdminDataTableProps<TData>) {
    const locale = useLocale();
    const navigate = useNavigate();
    const openDetailsLabel = { de: 'Details öffnen', en: 'Open details' }[locale];
    const rowLinks = getRowTo != null;
    const paginationVisible = showPagination ?? onPageChange != null;

    const table = useTable({
        features,
        data,
        columns,
        manualPagination: true,
        manualSorting: true,
        pageCount,
        onSortingChange,
        state: {
            sorting,
            pagination: {
                pageIndex: page - 1,
                pageSize: data.length || 1,
            },
        },
    });

    function navigateToRow(row: TData) {
        if (!getRowTo) return;
        const link = getRowTo(row);
        void navigate({ to: link.to as never, params: link.params as never });
    }

    function onRowClick(event: MouseEvent<HTMLTableRowElement>, row: TData) {
        if (!getRowTo) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('a, button')) return;
        navigateToRow(row);
    }

    return (
        <div className="grid gap-4">
            <div className="overflow-hidden rounded-xl border border-border bg-secondary">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                                    </TableHead>
                                ))}
                                {rowLinks ? (
                                    <TableHead className={stickyOpenClassName}>
                                        <span className="sr-only">{openDetailsLabel}</span>
                                    </TableHead>
                                ) : null}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map((row) => {
                                const link = getRowTo?.(row.original);
                                return (
                                    <TableRow
                                        key={row.id}
                                        className={rowLinks ? 'group cursor-pointer' : undefined}
                                        onClick={rowLinks ? (event) => onRowClick(event, row.original) : undefined}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                <table.FlexRender cell={cell} />
                                            </TableCell>
                                        ))}
                                        {link ? (
                                            <TableCell className={stickyOpenClassName}>
                                                <Link
                                                    to={link.to as never}
                                                    params={link.params as never}
                                                    aria-label={openDetailsLabel}
                                                    className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                    onClick={(event) => event.stopPropagation()}
                                                >
                                                    <ChevronRightIcon className="size-4" aria-hidden />
                                                </Link>
                                            </TableCell>
                                        ) : null}
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length + (rowLinks ? 1 : 0)} className="h-24 text-center text-muted-foreground">
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {paginationVisible && pageCount > 1 && onPageChange != null ? (
                <Pagination className="mx-0 justify-end">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                aria-disabled={page <= 1 || undefined}
                                tabIndex={page <= 1 ? -1 : undefined}
                                className={cn(page <= 1 && 'pointer-events-none opacity-50')}
                                onClick={(event) => {
                                    event.preventDefault();
                                    if (page > 1) onPageChange(page - 1);
                                }}
                            />
                        </PaginationItem>
                        <PaginationItem>
                            <span className="px-2 text-sm text-muted-foreground tabular-nums">
                                {{ de: `Seite ${page} von ${pageCount}`, en: `Page ${page} of ${pageCount}` }[locale]}
                            </span>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                aria-disabled={page >= pageCount || undefined}
                                tabIndex={page >= pageCount ? -1 : undefined}
                                className={cn(page >= pageCount && 'pointer-events-none opacity-50')}
                                onClick={(event) => {
                                    event.preventDefault();
                                    if (page < pageCount) onPageChange(page + 1);
                                }}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            ) : null}
        </div>
    );
}
