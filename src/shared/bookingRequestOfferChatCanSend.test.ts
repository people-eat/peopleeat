import { describe, expect, it } from 'vitest';

import { bookingRequestOfferChatCanSend } from './bookingRequestOfferChatCanSend';

describe('bookingRequestOfferChatCanSend', () => {
    it('disables only decline and cancel statuses', () => {
        expect(bookingRequestOfferChatCanSend('USER_DECLINED')).toBe(false);
        expect(bookingRequestOfferChatCanSend('COOK_DECLINED')).toBe(false);
        expect(bookingRequestOfferChatCanSend('CANCELED')).toBe(false);
    });

    it('keeps negotiation and post-accept statuses sendable', () => {
        for (const status of [
            'USER_NEEDS_TO_ACCEPT',
            'COOK_NEEDS_TO_ACCEPT',
            'USER_REQUESTED_MENU_CHANGES',
            'USER_NEEDS_DEPOSIT_PAYMENT',
            'PAYMENT_PULL_PENDING',
            'EVENT_PENDING',
            'COMPLETED',
            'EXPIRED',
            'USER_CHOOSE_DIFFERENT_OFFER',
        ]) {
            expect(bookingRequestOfferChatCanSend(status)).toBe(true);
        }
    });
});
