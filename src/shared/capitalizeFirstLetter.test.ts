import { describe, expect, it } from 'vitest';

import { capitalizeFirstLetter } from './capitalizeFirstLetter';

describe('capitalizeFirstLetter', () => {
    it('capitalizes the first character', () => {
        expect(capitalizeFirstLetter('hello')).toBe('Hello');
    });

    it('returns empty string unchanged', () => {
        expect(capitalizeFirstLetter('')).toBe('');
    });

    it('leaves an already-capitalized string unchanged', () => {
        expect(capitalizeFirstLetter('Hello')).toBe('Hello');
    });
});
