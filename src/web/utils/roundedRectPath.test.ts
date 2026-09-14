import { describe, expect, it } from 'vitest';
import { roundedRectPath } from './roundedRectPath';

describe('roundedRectPath', () => {
    it('returns empty string when inset swallows the rect', () => {
        expect(roundedRectPath(4, 4, { topLeft: 1, topRight: 1, bottomRight: 1, bottomLeft: 1 }, 3)).toBe('');
    });

    it('builds a sharp rect when all radii are zero', () => {
        expect(roundedRectPath(100, 40, { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 })).toBe(
            'M 0 0 H 100 L 100 0 V 40 L 100 40 H 0 L 0 40 V 0 L 0 0 Z',
        );
    });

    it('emits arcs for positive corner radii', () => {
        const d = roundedRectPath(100, 40, { topLeft: 8, topRight: 8, bottomRight: 2, bottomLeft: 8 });
        expect(d).toContain('A 8 8 0 0 1');
        expect(d).toContain('A 2 2 0 0 1');
        expect(d.startsWith('M 8 0')).toBe(true);
        expect(d.endsWith('Z')).toBe(true);
    });

    it('applies inset to position and radii', () => {
        const d = roundedRectPath(100, 40, { topLeft: 10, topRight: 10, bottomRight: 10, bottomLeft: 10 }, 2);
        expect(d.startsWith('M 10 2')).toBe(true);
        expect(d).toContain('A 8 8 0 0 1');
    });

    it('clamps radii that exceed a side', () => {
        const d = roundedRectPath(20, 20, { topLeft: 30, topRight: 30, bottomRight: 0, bottomLeft: 0 });
        expect(d).toContain('A 10 10 0 0 1');
        expect(d).not.toContain('A 30 30');
    });
});
