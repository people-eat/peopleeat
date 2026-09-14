import { describe, expect, it } from 'vitest';

import { userDisplayName } from './userDisplayName';

describe('userDisplayName', () => {
    it('joins first and last name', () => {
        expect(userDisplayName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
    });

    it('trims surrounding whitespace on the joined string', () => {
        expect(userDisplayName({ firstName: ' Ada', lastName: 'Lovelace ' })).toBe('Ada Lovelace');
    });
});
