import { describe, expect, it } from 'vitest';

import { adminMapPageVariables, adminMapSearchForUrl, adminMapSearchResolve, parseAdminMapSearch } from './adminMapSearch';

describe('adminMapSearch', () => {
    it('defaults to all layers and a 90-day range', () => {
        const resolved = adminMapSearchResolve({}, new Date('2026-11-03T12:00:00.000Z'));
        expect([...resolved.layers].sort()).toEqual(['bookings', 'cities', 'cooks', 'partners']);
        expect(resolved.range).toEqual({ from: '2026-08-06', to: '2026-11-03' });
        expect(resolved.focus).toBeNull();
    });

    it('parses layers and focus from the URL search', () => {
        const search = parseAdminMapSearch({
            from: '2026-01-01',
            to: '2026-01-31',
            layers: 'cooks,cities',
            focus: 'city:abc123XYZ_abc123XYZ',
        });
        const resolved = adminMapSearchResolve(search);
        expect([...resolved.layers].sort()).toEqual(['cities', 'cooks']);
        expect(resolved.focus).toEqual({ kind: 'city', id: 'abc123XYZ_abc123XYZ' });
        expect(adminMapSearchForUrl(resolved)).toEqual({
            from: '2026-01-01',
            to: '2026-01-31',
            layers: 'cooks,cities',
            focus: 'city:abc123XYZ_abc123XYZ',
        });
    });

    it('omits bookings from GraphQL variables when the bookings layer is off', () => {
        const variables = adminMapPageVariables({
            from: '2026-01-01',
            to: '2026-01-31',
            layers: 'cooks',
        });
        expect(variables.includeBookings).toBe(false);
        expect(typeof variables.range.startDateTime).toBe('string');
        expect(typeof variables.range.endDateTime).toBe('string');
    });
});
