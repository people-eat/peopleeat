import { describe, expect, it } from 'vitest';

import {
    ADMIN_LIST_DEFAULT_PAGE_SIZE,
    adminListPageCount,
    adminListPageSize,
    adminListPaginationForUrl,
    adminListSkipTake,
    parseAdminListPage,
    parseAdminListPageSize,
} from './adminListPaginationSearch';

describe('adminListPaginationSearch', () => {
    it('parses page and pageSize from search params', () => {
        expect(parseAdminListPage({ page: '3' })).toBe(3);
        expect(parseAdminListPage({ page: 0 })).toBeUndefined();
        expect(parseAdminListPageSize({ pageSize: '50' })).toBe(50);
        expect(parseAdminListPageSize({ pageSize: '15' })).toBeUndefined();
    });

    it('omits defaults from the URL shape', () => {
        expect(adminListPaginationForUrl({ page: 1, pageSize: ADMIN_LIST_DEFAULT_PAGE_SIZE })).toEqual({});
        expect(adminListPaginationForUrl({ page: 2, pageSize: 50 })).toEqual({ page: 2, pageSize: 50 });
    });

    it('computes skip/take and page count', () => {
        expect(adminListPageSize({})).toBe(ADMIN_LIST_DEFAULT_PAGE_SIZE);
        expect(adminListSkipTake({ page: 2, pageSize: 10 })).toEqual({ skip: 10, take: 10 });
        expect(adminListPageCount(0, 25)).toBe(1);
        expect(adminListPageCount(26, 25)).toBe(2);
    });
});
