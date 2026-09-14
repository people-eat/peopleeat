import { describe, expect, it } from 'vitest';

import { adminUserSortResolve } from './adminUserOrderBy';

describe('adminUserSortResolve', () => {
    it('defaults to createdAt DESC when sort is omitted', () => {
        expect(adminUserSortResolve({})).toEqual({ sortField: 'createdAt', sortDirection: 'DESC' });
    });

    it('keeps the requested field and defaults direction to DESC', () => {
        expect(adminUserSortResolve({ sortField: 'firstName' })).toEqual({ sortField: 'firstName', sortDirection: 'DESC' });
    });

    it('honors ASC', () => {
        expect(adminUserSortResolve({ sortField: 'emailAddress', sortDirection: 'ASC' })).toEqual({
            sortField: 'emailAddress',
            sortDirection: 'ASC',
        });
    });
});
