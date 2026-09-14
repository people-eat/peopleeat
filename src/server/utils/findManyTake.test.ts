import { describe, expect, it } from 'vitest';

import { findManySkip, findManyTake } from './findManyTake';

describe('findManyTake', () => {
    it('defaults to 25 when omitted', () => {
        expect(findManyTake(undefined)).toBe(25);
        expect(findManyTake(null)).toBe(25);
    });

    it('clamps to [1, 100]', () => {
        expect(findManyTake(0)).toBe(1);
        expect(findManyTake(-4)).toBe(1);
        expect(findManyTake(1000)).toBe(100);
        expect(findManyTake(40)).toBe(40);
    });
});

describe('findManySkip', () => {
    it('defaults to 0 and rejects negatives', () => {
        expect(findManySkip(undefined)).toBe(0);
        expect(findManySkip(null)).toBe(0);
        expect(findManySkip(-1)).toBe(0);
        expect(findManySkip(10)).toBe(10);
    });
});
