import { describe, expect, it } from 'vitest';

import { graphqlDateToIsoDate } from './graphqlDateToIsoDate';

describe('graphqlDateToIsoDate', () => {
    it('formats a JS Date via UTC ISO', () => {
        expect(graphqlDateToIsoDate(new Date(Date.UTC(2026, 8, 16)))).toBe('2026-09-16');
    });

    it('passes through YYYY-MM-DD strings', () => {
        expect(graphqlDateToIsoDate('2026-09-16')).toBe('2026-09-16');
        expect(graphqlDateToIsoDate('2026-09-16T00:00:00.000Z')).toBe('2026-09-16');
    });

    it('does not produce locale junk from Date.toString()', () => {
        const value = graphqlDateToIsoDate(new Date('2026-12-15T00:00:00.000Z'));
        expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(value).not.toMatch(/^[A-Za-z]{3} /);
    });
});
