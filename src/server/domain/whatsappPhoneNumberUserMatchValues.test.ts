import { describe, expect, it } from 'vitest';

import { whatsappPhoneNumberUserMatchValues } from './whatsapp';

describe('whatsappPhoneNumberUserMatchValues', () => {
    it('covers E.164 and Meta digits forms', () => {
        expect(whatsappPhoneNumberUserMatchValues('+4915123456789').sort()).toEqual(['+4915123456789', '4915123456789']);
        expect(whatsappPhoneNumberUserMatchValues('4915123456789').sort()).toEqual(['+4915123456789', '4915123456789']);
    });

    it('returns empty for blank input', () => {
        expect(whatsappPhoneNumberUserMatchValues('')).toEqual([]);
        expect(whatsappPhoneNumberUserMatchValues('   ')).toEqual([]);
    });
});
