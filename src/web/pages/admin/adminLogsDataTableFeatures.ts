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

export const adminLogsDataTableFeatures = tableFeatures({
    columnFilteringFeature,
    columnVisibilityFeature,
    rowPaginationFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    filterFns: { includesString: filterFn_includesString },
});

export type AdminLogsDataTableFeatures = typeof adminLogsDataTableFeatures;
