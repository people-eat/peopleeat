import { describe, expect, it } from 'vitest';

import { emailAddressPresent } from './emailAddressPresent';

describe('emailAddressPresent', () => {
    it('returns null when email is missing', () => {
        expect(emailAddressPresent(null)).toBeNull();
        expect(emailAddressPresent(undefined)).toBeNull();
        expect(emailAddressPresent({ emailAddress: null, firstName: 'Ada' })).toBeNull();
        expect(emailAddressPresent({ emailAddress: '', firstName: 'Ada' })).toBeNull();
    });

    it('narrows a row with a sendable email', () => {
        const row = emailAddressPresent({ emailAddress: 'ada@example.com', firstName: 'Ada', userId: 'u1' });
        expect(row).toEqual({ emailAddress: 'ada@example.com', firstName: 'Ada', userId: 'u1' });
    });
});
