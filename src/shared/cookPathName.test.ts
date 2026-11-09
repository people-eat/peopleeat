import { describe, expect, it } from 'vitest';

import { cookPathNameCandidate, cookPathNameFromNames, cookPathNameNormalize, cookPathNameTryNormalize } from './cookPathName';

describe('cookPathNameFromNames', () => {
    it('matches the SQL backfill fixtures', () => {
        expect(cookPathNameFromNames('Jörg', 'Müller')).toBe('joerg-mueller');
        expect(cookPathNameFromNames('Müller', '')).toBe('mueller');
        expect(cookPathNameFromNames(' ', ' ')).toBe('chef');
        expect(cookPathNameFromNames('', '')).toBe('chef');
    });

    it('hyphenates first and last name', () => {
        expect(cookPathNameFromNames('Anna', 'Schmidt')).toBe('anna-schmidt');
    });
});

describe('cookPathNameNormalize', () => {
    it('normalizes typed input to a slug', () => {
        expect(cookPathNameNormalize(' Jörg Müller ')).toBe('joerg-mueller');
    });

    it('rejects empty slugs', () => {
        expect(() => cookPathNameNormalize('   ')).toThrow(/pathName must not be empty/);
        expect(cookPathNameTryNormalize('   ')).toBeNull();
    });

    it('rejects nanoId-shaped slugs', () => {
        const nanoIdShaped = 'abcdefghij1234567890';
        expect(nanoIdShaped).toHaveLength(20);
        expect(cookPathNameTryNormalize(nanoIdShaped)).toBeNull();
        expect(() => cookPathNameNormalize(nanoIdShaped)).toThrow(/pathName must not be empty/);
    });
});

describe('cookPathNameCandidate', () => {
    it('leaves the first owner without a numeric suffix', () => {
        expect(cookPathNameCandidate('anna-mueller', 1)).toBe('anna-mueller');
        expect(cookPathNameCandidate('anna-mueller', 2)).toBe('anna-mueller-2');
    });
});
