import { describe, expect, it } from 'vitest';

import {
    textNormalizeProse,
    textNormalizeProseTitled,
    textNormalizeSingleLine,
    textNormalizeTitled,
    textNormalizeTitledOrNull,
} from './textNormalize';

describe('textNormalizeSingleLine', () => {
    it('trims and collapses whitespace runs', () => {
        expect(textNormalizeSingleLine('  Anna   Maria  ')).toBe('Anna Maria');
        expect(textNormalizeSingleLine('a\t\nb')).toBe('a b');
    });

    it('returns empty for whitespace-only input', () => {
        expect(textNormalizeSingleLine('   \n\t  ')).toBe('');
    });
});

describe('textNormalizeTitled', () => {
    it('normalizes whitespace and capitalizes the first letter', () => {
        expect(textNormalizeTitled('  birthday  dinner ')).toBe('Birthday dinner');
    });

    it('returns empty for blank input', () => {
        expect(textNormalizeTitled('   ')).toBe('');
    });
});

describe('textNormalizeProse', () => {
    it('preserves newlines while collapsing horizontal whitespace', () => {
        expect(textNormalizeProse('  hello   world  \n\n\n  next  line  ')).toBe('hello world\n\nnext line');
    });

    it('normalizes CRLF to LF', () => {
        expect(textNormalizeProse('a\r\nb')).toBe('a\nb');
    });
});

describe('textNormalizeProseTitled', () => {
    it('capitalizes after prose normalize', () => {
        expect(textNormalizeProseTitled('  please  cook  ')).toBe('Please cook');
    });
});

describe('textNormalizeTitledOrNull', () => {
    it('returns null for blank input', () => {
        expect(textNormalizeTitledOrNull(null)).toBeNull();
        expect(textNormalizeTitledOrNull('   ')).toBeNull();
    });

    it('returns a titled string otherwise', () => {
        expect(textNormalizeTitledOrNull('  chef  anna ')).toBe('Chef anna');
    });
});
