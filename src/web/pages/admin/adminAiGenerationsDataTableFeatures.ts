import {
    columnFilteringFeature,
    columnVisibilityFeature,
    createFilteredRowModel,
    createPaginatedRowModel,
    filterFn_includesString,
    rowPaginationFeature,
    rowSortingFeature,
    tableFeatures,
} from '@tanstack/react-table';

export const adminAiGenerationsDataTableFeatures = tableFeatures({
    columnFilteringFeature,
    columnVisibilityFeature,
    rowPaginationFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    filterFns: { includesString: filterFn_includesString },
});

export type AdminAiGenerationsDataTableFeatures = typeof adminAiGenerationsDataTableFeatures;
