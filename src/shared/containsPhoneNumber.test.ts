import { describe, expect, it } from 'vitest';

import { containsPhoneNumber } from './containsPhoneNumber';

describe('containsPhoneNumber', () => {
    it.each([
        ['015112345678'],
        ['0151 123 456 78'],
        ['+49 151 12345678'],
        ['+4915112345678'],
        ['0049 151 12345678'],
        ['(030) 1234567'],
        ['030/1234567'],
        ['Call me at 0151-123-45678 please'],
    ])('detects %s', (text) => {
        expect(containsPhoneNumber(text)).toBe(true);
    });

    it.each([
        ['Hello, looking forward to the evening!'],
        ['We are 6 people'],
        ['Menu costs 150 euro'],
        ['See you at 19:00'],
        ['Apartment 12'],
    ])('does not flag %s', (text) => {
        expect(containsPhoneNumber(text)).toBe(false);
    });
});
