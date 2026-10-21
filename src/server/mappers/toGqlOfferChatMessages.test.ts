import { describe, expect, it } from 'vitest';

import type { BookingRequestOfferEvent } from '../db/schema';
import { toGqlOfferChatMessages } from './toGqlOfferChatMessages';

const customer = { display: 'Guest', createdAt: new Date('2020-01-01'), profilePicture: null };
const cook = { display: 'Chef', createdAt: new Date('2020-01-01'), profilePicture: null };

function messageEvent(
    type: 'USER_MESSAGE_SIMPLE' | 'COOK_MESSAGE_SIMPLE' | 'ADMIN_MESSAGE_SIMPLE',
    id: string,
    payload: BookingRequestOfferEvent['payload'] = { messageBody: 'hi' },
): BookingRequestOfferEvent {
    return {
        bookingRequestOfferEventId: id,
        bookingRequestOfferId: 'offer_1',
        type,
        payload,
        createdAt: new Date('2024-01-01T12:00:00.000Z'),
    };
}

describe('toGqlOfferChatMessages admin rails', () => {
    it('puts customer left and cook + admin right for admin viewers', () => {
        const messages = toGqlOfferChatMessages({
            events: [
                messageEvent('USER_MESSAGE_SIMPLE', 'e_user'),
                messageEvent('COOK_MESSAGE_SIMPLE', 'e_cook'),
                messageEvent('ADMIN_MESSAGE_SIMPLE', 'e_admin'),
            ],
            customer,
            cook,
            viewerRole: 'admin',
        });

        expect(messages).toMatchObject([
            { chatMessageId: 'e_user', isOwn: false, author: { display: 'Guest' } },
            { chatMessageId: 'e_cook', isOwn: true, author: { display: 'Chef' } },
            { chatMessageId: 'e_admin', isOwn: true, author: { display: 'Admin' } },
        ]);
    });

    it('keeps cook messages own only for cook viewers, not customers', () => {
        const events = [messageEvent('COOK_MESSAGE_SIMPLE', 'e_cook')];
        const forCook = toGqlOfferChatMessages({ events, customer, cook, viewerRole: 'cook' });
        const forUser = toGqlOfferChatMessages({ events, customer, cook, viewerRole: 'user' });

        expect(forCook[0]).toMatchObject({ isOwn: true });
        expect(forUser[0]).toMatchObject({ isOwn: false });
    });

    it('keeps handed-over prior-chef bubbles on the cook rail for admin, not own for the new cook', () => {
        const events = [
            messageEvent('COOK_MESSAGE_SIMPLE', 'e_handover', {
                messageBody: 'From previous chef',
                handedOverFrom: {
                    cookId: 'cook_old',
                    cookDisplayName: 'Chef Alpha',
                    sourceEventId: 'e_src',
                },
                originalCreatedAt: '2024-01-01T10:00:00.000Z',
            }),
        ];

        const forAdmin = toGqlOfferChatMessages({ events, customer, cook, viewerRole: 'admin' });
        const forCook = toGqlOfferChatMessages({ events, customer, cook, viewerRole: 'cook' });

        expect(forAdmin[0]).toMatchObject({ isOwn: true, author: { display: 'Chef Alpha' } });
        expect(forCook[0]).toMatchObject({ isOwn: false, author: { display: 'Chef Alpha' } });
    });
});
