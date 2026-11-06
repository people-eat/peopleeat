import { describe, expect, it } from 'vitest';

import { bookingRequestSuggestedOfferMessage } from './bookingRequestSuggestedOfferMessage';
import {
    cookDefaultOfferMessageFormFrom,
    cookDefaultOfferMessageModeFrom,
    cookDefaultOfferMessageNormalize,
    cookDefaultOfferMessageUpdateFrom,
    cookSuggestedOfferMessageResolve,
} from './cookDefaultOfferMessage';

describe('cookDefaultOfferMessageModeFrom', () => {
    it('maps null, empty, and text', () => {
        expect(cookDefaultOfferMessageModeFrom(null)).toBe('template');
        expect(cookDefaultOfferMessageModeFrom('')).toBe('empty');
        expect(cookDefaultOfferMessageModeFrom('Hallo')).toBe('custom');
    });
});

describe('cookDefaultOfferMessageFormFrom', () => {
    it('keeps custom text and clears the textarea for other modes', () => {
        expect(cookDefaultOfferMessageFormFrom(null)).toEqual({ defaultOfferMessageMode: 'template', defaultOfferMessageText: '' });
        expect(cookDefaultOfferMessageFormFrom('')).toEqual({ defaultOfferMessageMode: 'empty', defaultOfferMessageText: '' });
        expect(cookDefaultOfferMessageFormFrom('Hallo')).toEqual({ defaultOfferMessageMode: 'custom', defaultOfferMessageText: 'Hallo' });
    });
});

describe('cookDefaultOfferMessageUpdateFrom', () => {
    it('omits the field while the cook keeps the platform greeting', () => {
        expect(cookDefaultOfferMessageUpdateFrom({ current: null, mode: 'template', text: '' })).toBeUndefined();
    });

    it('writes empty or text only when the stored value would change', () => {
        expect(cookDefaultOfferMessageUpdateFrom({ current: null, mode: 'empty', text: '' })).toBe('');
        expect(cookDefaultOfferMessageUpdateFrom({ current: '', mode: 'empty', text: '' })).toBeUndefined();
        expect(cookDefaultOfferMessageUpdateFrom({ current: null, mode: 'custom', text: 'Hallo' })).toBe('Hallo');
        expect(cookDefaultOfferMessageUpdateFrom({ current: 'Hallo', mode: 'custom', text: 'Hallo' })).toBeUndefined();
        expect(cookDefaultOfferMessageUpdateFrom({ current: 'Hallo', mode: 'empty', text: 'Hallo' })).toBe('');
    });
});

describe('cookSuggestedOfferMessageResolve', () => {
    it('uses the static greeting only while the cook default is null', () => {
        expect(cookSuggestedOfferMessageResolve(null, 'de')).toBe(bookingRequestSuggestedOfferMessage('de'));
        expect(cookSuggestedOfferMessageResolve('', 'de')).toBe('');
        expect(cookSuggestedOfferMessageResolve('Hallo', 'en')).toBe('Hallo');
    });
});

describe('cookDefaultOfferMessageNormalize', () => {
    it('keeps an empty string and rejects phone numbers', () => {
        expect(cookDefaultOfferMessageNormalize('  ', 'cookUpdate')).toBe('');
        expect(cookDefaultOfferMessageNormalize('Hallo  \n  Gast', 'cookUpdate')).toBe('Hallo\nGast');
        expect(() => cookDefaultOfferMessageNormalize('Call +4915123456789', 'cookUpdate')).toThrow(/phone number/);
    });
});
