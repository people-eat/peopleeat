import { describe, expect, it } from 'vitest';

import { adminMapCookStatusDerive } from './adminMapCookStatusDerive';

describe('adminMapCookStatusDerive', () => {
    it('returns LISTABLE for active approved visible cooks', () => {
        expect(adminMapCookStatusDerive({ isVisible: true, isApprovedByAdmin: true }, 'ACTIVE')).toBe('LISTABLE');
    });

    it('returns PENDING when not admin-approved', () => {
        expect(adminMapCookStatusDerive({ isVisible: true, isApprovedByAdmin: false }, 'ACTIVE')).toBe('PENDING');
    });

    it('returns HIDDEN when approved but not visible', () => {
        expect(adminMapCookStatusDerive({ isVisible: false, isApprovedByAdmin: true }, 'ACTIVE')).toBe('HIDDEN');
    });

    it('returns HIDDEN when the user is not ACTIVE', () => {
        expect(adminMapCookStatusDerive({ isVisible: true, isApprovedByAdmin: true }, 'BANNED')).toBe('HIDDEN');
    });
});
