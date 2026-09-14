import { describe, expect, it } from 'vitest';

import {
    giftCardFormSearchEqual,
    giftCardFormSearchFromValues,
    giftCardFormValuesFromSearch,
    parseGiftCardFormSearch,
} from './giftCardFormSearch';

describe('parseGiftCardFormSearch', () => {
    it('parses amount, occasion, recipient, message, and auth step', () => {
        const search = parseGiftCardFormSearch({
            amount: '250',
            occasion: 'Hochzeit',
            recipient: ' Anna & Tom ',
            message: 'Viel Freude',
            step: 'auth',
        });

        expect(search).toEqual({
            amount: 250,
            occasion: 'Hochzeit',
            recipient: 'Anna & Tom',
            message: 'Viel Freude',
            step: 'auth',
        });
    });

    it('drops unknown occasions and invalid steps', () => {
        const search = parseGiftCardFormSearch({
            occasion: 'Unknown',
            step: 'checkout',
            amount: -10,
        });
        expect(search).toEqual({
            amount: undefined,
            occasion: undefined,
            recipient: undefined,
            message: undefined,
            step: undefined,
        });
    });

    it('round-trips draft values through search', () => {
        const values = giftCardFormValuesFromSearch(
            parseGiftCardFormSearch({
                amount: 175,
                occasion: 'Geburtstag',
                recipient: 'Anna',
                message: 'Hello',
                step: 'auth',
            }),
        );
        expect(values).toEqual({
            amountPreset: 'custom',
            customEuros: '175',
            occasion: 'Geburtstag',
            recipientName: 'Anna',
            message: 'Hello',
        });

        const nextSearch = giftCardFormSearchFromValues({ values, step: 'auth' });
        expect(nextSearch).toEqual({
            amount: 175,
            occasion: undefined,
            recipient: 'Anna',
            message: 'Hello',
            step: 'auth',
        });
        expect(giftCardFormSearchEqual(nextSearch, nextSearch)).toBe(true);
    });

    it('omits default amount and configure step from search', () => {
        const values = giftCardFormValuesFromSearch({});
        const nextSearch = giftCardFormSearchFromValues({ values, step: 'configure' });
        expect(nextSearch).toEqual({
            amount: undefined,
            occasion: undefined,
            recipient: undefined,
            message: undefined,
            step: undefined,
        });
    });
});
