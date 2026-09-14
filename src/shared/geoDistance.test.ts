import { describe, expect, it } from 'vitest';

import { geoDistance } from './geoDistance';

describe('geoDistance', () => {
    it('returns ~0 for the same point', () => {
        expect(geoDistance({ latitude: 52.52, longitude: 13.405 }, { latitude: 52.52, longitude: 13.405 })).toBeCloseTo(0, 5);
    });

    it('returns a positive distance between Berlin and Munich', () => {
        const km = geoDistance({ latitude: 52.52, longitude: 13.405 }, { latitude: 48.137, longitude: 11.575 });
        expect(km).toBeGreaterThan(450);
        expect(km).toBeLessThan(600);
    });
});
