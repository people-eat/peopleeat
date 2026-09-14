import { describe, expect, it } from 'vitest';

import { likeContainsPattern } from './likeContainsPattern';

describe('likeContainsPattern', () => {
    it('returns null for empty input', () => {
        expect(likeContainsPattern(null)).toBeNull();
        expect(likeContainsPattern(undefined)).toBeNull();
        expect(likeContainsPattern('')).toBeNull();
        expect(likeContainsPattern('   ')).toBeNull();
    });

    it('trims and wraps a contains pattern, stripping LIKE wildcards', () => {
        expect(likeContainsPattern('  alice  ')).toBe('%alice%');
        expect(likeContainsPattern('a%b_c')).toBe('%abc%');
    });
});
