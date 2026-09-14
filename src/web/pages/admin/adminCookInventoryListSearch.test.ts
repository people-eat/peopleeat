import { describe, expect, it } from 'vitest';

import {
    adminCookInventoryListCriterion,
    adminCookInventoryListHasActiveFilters,
    adminCookInventoryListSearchForUrl,
    parseAdminCookInventoryListSearch,
} from './adminCookInventoryListSearch';

describe('adminCookInventoryListSearch', () => {
    it('parses filters and omits defaults from the URL shape', () => {
        expect(
            parseAdminCookInventoryListSearch({
                q: ' risotto ',
                status: 'DRAFT',
                cookId: 'cook_abc',
                image: 'notPublic',
                sort: 'title',
                dir: 'asc',
                page: '2',
                pageSize: '50',
            }),
        ).toEqual({
            q: 'risotto',
            status: 'DRAFT',
            cookId: 'cook_abc',
            image: 'notPublic',
            sort: 'title',
            dir: 'asc',
            page: 2,
            pageSize: 50,
        });

        expect(parseAdminCookInventoryListSearch({ missingImage: '1' }).image).toBe('notPublic');

        expect(
            adminCookInventoryListSearchForUrl({
                q: 'x',
                image: 'with',
                page: 1,
                pageSize: 25,
            }),
        ).toEqual({ q: 'x', image: 'with' });
    });

    it('maps search to GraphQL criterion', () => {
        expect(
            adminCookInventoryListCriterion(
                { q: 'Antoine', status: 'PUBLISHED', cookId: 'c1', sort: 'title', dir: 'asc', image: 'public' },
                { includeImageFilter: true },
            ),
        ).toEqual({
            skip: 0,
            take: 25,
            searchText: 'Antoine',
            cookIds: ['c1'],
            includeDeleted: false,
            status: 'PUBLISHED',
            imageFilter: 'ON_PUBLIC_PAGE',
            sortField: 'title',
            sortDirection: 'ASC',
        });

        expect(adminCookInventoryListHasActiveFilters({})).toBe(false);
        expect(adminCookInventoryListHasActiveFilters({ image: 'without' })).toBe(true);
    });
});
