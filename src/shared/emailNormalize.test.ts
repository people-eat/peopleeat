import { describe, expect, it } from 'vitest';

import { emailNormalize } from './emailNormalize';

describe('emailNormalize', () => {
    it('trims and lowercases', () => {
        expect(emailNormalize('  Ada@Example.COM ')).toBe('ada@example.com');
    });
});
