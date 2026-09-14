import type { SortingState, Updater } from '@tanstack/react-table';

type AdminListSortDirection = 'asc' | 'desc';

export type AdminListSortSearch<TField extends string = string> = {
    sort?: TField;
    dir?: AdminListSortDirection;
};

export function parseAdminListSortSearch<TField extends string>(
    search: Record<string, unknown>,
    allowedFields: readonly TField[],
    defaultField: string = 'createdAt',
): AdminListSortSearch<TField> {
    const sort =
        typeof search.sort === 'string' && (allowedFields as readonly string[]).includes(search.sort) ? (search.sort as TField) : undefined;
    const dir = search.dir === 'asc' || search.dir === 'desc' ? search.dir : undefined;
    if (sort == null) {
        return {};
    }
    const resolvedDir = dir ?? 'desc';
    if (sort === defaultField && resolvedDir === 'desc') {
        return {};
    }
    return { sort, dir: resolvedDir };
}

export function adminListSortToCriterion<TField extends string>(
    search: AdminListSortSearch<TField>,
    defaultField: string = 'createdAt',
): { sortField: TField; sortDirection: 'ASC' | 'DESC' } | Record<string, never> {
    const sortField = (search.sort ?? defaultField) as TField;
    const sortDirection = (search.dir ?? 'desc') === 'asc' ? ('ASC' as const) : ('DESC' as const);
    if (sortField === defaultField && sortDirection === 'DESC') {
        return {};
    }
    return { sortField, sortDirection };
}

export function adminListSortSearchForUrl<TField extends string>(
    search: AdminListSortSearch<TField>,
    defaultField: string = 'createdAt',
): AdminListSortSearch<TField> {
    const sort = search.sort ?? (defaultField as TField);
    const dir = search.dir ?? 'desc';
    if (sort === defaultField && dir === 'desc') {
        return {};
    }
    return { sort, dir };
}

export function adminListSortingState<TField extends string>(
    search: AdminListSortSearch<TField>,
    defaultField: string = 'createdAt',
): SortingState {
    return [
        {
            id: search.sort ?? defaultField,
            desc: (search.dir ?? 'desc') === 'desc',
        },
    ];
}

export function adminListSortFromSortingState<TField extends string>(
    updater: Updater<SortingState>,
    current: SortingState,
    allowedFields: readonly TField[],
    defaultField: string = 'createdAt',
): AdminListSortSearch<TField> {
    const next = typeof updater === 'function' ? updater(current) : updater;
    const first = next[0];
    if (first == null || !(allowedFields as readonly string[]).includes(first.id)) {
        return {};
    }
    return adminListSortSearchForUrl(
        {
            sort: first.id as TField,
            dir: first.desc ? 'desc' : 'asc',
        },
        defaultField,
    );
}
