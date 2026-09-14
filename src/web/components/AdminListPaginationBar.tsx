import { useLocale } from '../hooks/useLocale';
import { ADMIN_LIST_PAGE_SIZE_OPTIONS } from '../pages/admin/adminListPaginationSearch';
import type { AdminListPageSize } from '../pages/admin/adminListPaginationSearch';
import { cn } from '../utils/cn';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from './base/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';

export function AdminListPaginationBar({
    page,
    pageCount,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
}: {
    page: number;
    pageCount: number;
    pageSize: AdminListPageSize;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: AdminListPageSize) => void;
}) {
    const locale = useLocale();
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    const canPrev = page > 1;
    const canNext = page < pageCount;
    const pageSizeAriaLabel = { de: 'Einträge pro Seite', en: 'Items per page' }[locale];

    return (
        <div className="@container flex w-full flex-nowrap items-center justify-between gap-2 @xl:gap-3">
            <div className="flex min-w-0 flex-nowrap items-center gap-2 @xl:gap-3">
                <label className="flex items-center gap-2 text-sm">
                    <span className="hidden text-muted-foreground @xl:inline">{{ de: 'Pro Seite', en: 'Per page' }[locale]}</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                            if (value == null) return;
                            const next = Number(value);
                            if (!ADMIN_LIST_PAGE_SIZE_OPTIONS.includes(next as AdminListPageSize)) return;
                            onPageSizeChange(next as AdminListPageSize);
                        }}
                    >
                        <SelectTrigger size="sm" aria-label={pageSizeAriaLabel}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ADMIN_LIST_PAGE_SIZE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>
                <p className="truncate text-sm text-muted-foreground tabular-nums">
                    <span className="@xl:hidden">
                        {from}–{to}/{total}
                    </span>
                    <span className="hidden @xl:inline">
                        {
                            {
                                de: `${from}–${to} von ${total}`,
                                en: `${from}–${to} of ${total}`,
                            }[locale]
                        }
                    </span>
                </p>
            </div>

            <Pagination className="mx-0 w-auto shrink-0 justify-end">
                <PaginationContent className="gap-0 @xl:gap-1">
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            aria-disabled={!canPrev || undefined}
                            tabIndex={!canPrev ? -1 : undefined}
                            className={cn(
                                // Icon-only until `@xl`; `sm:px-0` / `[&>span]:hidden` override viewport chrome on the base control.
                                'size-8 gap-0 px-0 sm:px-0 [&>span]:hidden @xl:h-9 @xl:w-auto @xl:gap-1 @xl:px-2.5 @xl:pl-2.5 @xl:[&>span]:inline',
                                !canPrev && 'pointer-events-none opacity-50',
                            )}
                            onClick={(event) => {
                                event.preventDefault();
                                if (canPrev) onPageChange(page - 1);
                            }}
                        />
                    </PaginationItem>
                    <PaginationItem>
                        <span className="px-1 text-sm text-muted-foreground tabular-nums @xl:px-2">
                            <span className="@xl:hidden">
                                {page}/{pageCount}
                            </span>
                            <span className="hidden @xl:inline">
                                {{ de: `Seite ${page} von ${pageCount}`, en: `Page ${page} of ${pageCount}` }[locale]}
                            </span>
                        </span>
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            aria-disabled={!canNext || undefined}
                            tabIndex={!canNext ? -1 : undefined}
                            className={cn(
                                'size-8 gap-0 px-0 sm:px-0 [&>span]:hidden @xl:h-9 @xl:w-auto @xl:gap-1 @xl:px-2.5 @xl:pr-2.5 @xl:[&>span]:inline',
                                !canNext && 'pointer-events-none opacity-50',
                            )}
                            onClick={(event) => {
                                event.preventDefault();
                                if (canNext) onPageChange(page + 1);
                            }}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}
