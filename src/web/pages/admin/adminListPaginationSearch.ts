export const ADMIN_LIST_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export type AdminListPageSize = (typeof ADMIN_LIST_PAGE_SIZE_OPTIONS)[number];

export const ADMIN_LIST_DEFAULT_PAGE_SIZE: AdminListPageSize = 25;

const PAGE_SIZE_SET = new Set<number>(ADMIN_LIST_PAGE_SIZE_OPTIONS);

export type AdminListPaginationSearch = {
    page?: number;
    pageSize?: AdminListPageSize;
};

export function parseAdminListPage(search: Record<string, unknown>): number | undefined {
    const pageRaw = typeof search.page === 'number' ? search.page : typeof search.page === 'string' ? Number(search.page) : undefined;
    return pageRaw != null && Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : undefined;
}

export function parseAdminListPageSize(search: Record<string, unknown>): AdminListPageSize | undefined {
    const raw =
        typeof search.pageSize === 'number' ? search.pageSize : typeof search.pageSize === 'string' ? Number(search.pageSize) : undefined;
    if (raw == null || !Number.isFinite(raw) || !PAGE_SIZE_SET.has(raw)) return undefined;
    return raw as AdminListPageSize;
}

export function adminListPageSize(search: AdminListPaginationSearch): AdminListPageSize {
    return search.pageSize ?? ADMIN_LIST_DEFAULT_PAGE_SIZE;
}

export function adminListPaginationForUrl(search: AdminListPaginationSearch): AdminListPaginationSearch {
    const page = search.page && search.page > 1 ? search.page : undefined;
    const pageSize = search.pageSize != null && search.pageSize !== ADMIN_LIST_DEFAULT_PAGE_SIZE ? search.pageSize : undefined;
    return {
        ...(page != null ? { page } : {}),
        ...(pageSize != null ? { pageSize } : {}),
    };
}

export function adminListSkipTake(search: AdminListPaginationSearch): { skip: number; take: number } {
    const page = search.page ?? 1;
    const take = adminListPageSize(search);
    return {
        skip: (page - 1) * take,
        take,
    };
}

export function adminListPageCount(total: number, pageSize: number): number {
    return Math.max(1, Math.ceil(total / pageSize));
}
