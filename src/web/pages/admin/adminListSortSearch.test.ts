import { describe, expect, it } from 'vitest';

import {
    adminListSortFromSortingState,
    adminListSortingState,
    adminListSortSearchForUrl,
    adminListSortToCriterion,
    parseAdminListSortSearch,
} from './adminListSortSearch';

const FIELDS = ['firstName', 'lastName', 'emailAddress', 'createdAt'] as const;

describe('parseAdminListSortSearch', () => {
    it('omits the default createdAt desc', () => {
        expect(parseAdminListSortSearch({ sort: 'createdAt', dir: 'desc' }, FIELDS)).toEqual({});
    });

    it('keeps non-default sorts', () => {
        expect(parseAdminListSortSearch({ sort: 'firstName', dir: 'asc' }, FIELDS)).toEqual({ sort: 'firstName', dir: 'asc' });
    });

    it('rejects unknown fields', () => {
        expect(parseAdminListSortSearch({ sort: 'nope', dir: 'asc' }, FIELDS)).toEqual({});
    });
});

describe('adminListSortToCriterion', () => {
    it('omits criterion fields for the default sort', () => {
        expect(adminListSortToCriterion({})).toEqual({});
    });

    it('maps URL sort to GraphQL enums', () => {
        expect(adminListSortToCriterion({ sort: 'emailAddress', dir: 'asc' })).toEqual({
            sortField: 'emailAddress',
            sortDirection: 'ASC',
        });
    });
});

describe('adminListSortSearchForUrl', () => {
    it('drops default sort keys', () => {
        expect(adminListSortSearchForUrl({ sort: 'createdAt', dir: 'desc' })).toEqual({});
    });
});

describe('adminListSortingState', () => {
    it('always exposes an effective sort including the default', () => {
        expect(adminListSortingState({})).toEqual([{ id: 'createdAt', desc: true }]);
        expect(adminListSortingState({ sort: 'firstName', dir: 'asc' })).toEqual([{ id: 'firstName', desc: false }]);
    });
});

describe('adminListSortFromSortingState', () => {
    it('clears to default when sorting is removed', () => {
        expect(adminListSortFromSortingState([], [{ id: 'firstName', desc: false }], FIELDS)).toEqual({});
    });

    it('maps TanStack sorting into URL search', () => {
        expect(adminListSortFromSortingState([{ id: 'emailAddress', desc: true }], [{ id: 'createdAt', desc: true }], FIELDS)).toEqual({
            sort: 'emailAddress',
            dir: 'desc',
        });
    });
});
