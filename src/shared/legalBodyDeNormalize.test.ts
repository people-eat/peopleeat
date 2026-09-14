import { describe, expect, it } from 'vitest';

import { legalBodyDeNormalize } from './legalBodyDeNormalize';

describe('legalBodyDeNormalize', () => {
    it('returns empty for blank input', () => {
        expect(legalBodyDeNormalize('')).toBe('');
        expect(legalBodyDeNormalize('  \n\t  ')).toBe('');
    });

    it('trims and appends a trailing newline', () => {
        expect(legalBodyDeNormalize('  Hello\n\nWorld  ')).toBe('Hello\n\nWorld\n');
        expect(legalBodyDeNormalize('Hello\n')).toBe('Hello\n');
    });
});
