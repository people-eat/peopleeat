import { describe, expect, it } from 'vitest';

import { phoneNumberAssert, phoneNumberForWhatsAppApi, phoneNumberNormalize } from './phoneNumber';

describe('phoneNumberNormalize', () => {
    it('keeps valid E.164', () => {
        expect(phoneNumberNormalize('+4915255678560')).toBe('+4915255678560');
        expect(phoneNumberNormalize('+1626262626')).toBe('+1626262626');
    });

    it('strips formatting and adds + for bare international digits', () => {
        expect(phoneNumberNormalize('+49 152 5567 8560')).toBe('+4915255678560');
        expect(phoneNumberNormalize('4915255678560')).toBe('+4915255678560');
        expect(phoneNumberNormalize('(49) 152-5567-8560')).toBe('+4915255678560');
    });

    it('rejects trunk/local numbers without a country code', () => {
        expect(phoneNumberNormalize('015255678560')).toBeUndefined();
        expect(phoneNumberNormalize('0152 55678560')).toBeUndefined();
    });

    it('rejects empty and too-short values', () => {
        expect(phoneNumberNormalize(null)).toBeUndefined();
        expect(phoneNumberNormalize('')).toBeUndefined();
        expect(phoneNumberNormalize('+123')).toBeUndefined();
        expect(phoneNumberNormalize('abc')).toBeUndefined();
    });
});

describe('phoneNumberAssert', () => {
    it('returns normalized E.164', () => {
        expect(phoneNumberAssert('4915255678560', 'userCreate')).toBe('+4915255678560');
    });

    it('throws when invalid', () => {
        expect(() => phoneNumberAssert('015255678560', 'userCreate')).toThrow(/userCreate: phoneNumber must be E\.164 with country code/);
    });
});

describe('phoneNumberForWhatsAppApi', () => {
    it('strips the leading + for Meta', () => {
        expect(phoneNumberForWhatsAppApi('+4915255678560')).toBe('4915255678560');
    });
});
