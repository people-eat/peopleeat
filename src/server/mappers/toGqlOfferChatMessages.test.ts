import { describe, expect, it } from 'vitest';

import type { BookingRequestOfferEvent } from '../db/schema';
import type { BookingRequestOfferEventType } from '../domain/bookingRequest';
import { toGqlOfferChatMessages } from './toGqlOfferChatMessages';

const customer = { display: 'Guest', createdAt: new Date('2020-01-01'), profilePicture: null };
const cook = { display: 'Chef', createdAt: new Date('2020-01-01'), profilePicture: null };

function offerEvent(
    type: BookingRequestOfferEventType,
    id: string,
    payload: BookingRequestOfferEvent['payload'] = {},
): BookingRequestOfferEvent {
    return {
        bookingRequestOfferEventId: id,
        bookingRequestOfferId: 'offer_1',
        type,
        payload,
        createdAt: new Date('2024-01-01T12:00:00.000Z'),
    };
}

function messageEvent(
    type: 'USER_MESSAGE_SIMPLE' | 'COOK_MESSAGE_SIMPLE' | 'ADMIN_MESSAGE_SIMPLE',
    id: string,
    payload: BookingRequestOfferEvent['payload'] = { messageBody: 'hi' },
): BookingRequestOfferEvent {
    return offerEvent(type, id, payload);
}

describe('toGqlOfferChatMessages admin rails', () => {
    it('keeps customer and cook on the peer rail and admin on the own rail', () => {
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
            { chatMessageId: 'e_cook', isOwn: false, author: { display: 'Chef' } },
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

    it('keeps handed-over prior-chef bubbles as peer for admin and new cook', () => {
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

        expect(forAdmin[0]).toMatchObject({ isOwn: false, author: { display: 'Chef Alpha' } });
        expect(forCook[0]).toMatchObject({ isOwn: false, author: { display: 'Chef Alpha' } });
    });

    it('hides admin-only ops milestones from cook and customer, keeps handover visible', () => {
        const events = [
            offerEvent('ADMIN_CHANGED_PRICE', 'e_price', {
                priceBefore: {
                    platformFeePercentCook: 15,
                    platformFeePercentCustomer: 10,
                    travelExpensesCents: 1000,
                    menuPriceCents: 20000,
                    paymentProviderFeeCents: 400,
                    platformFeeCentsCook: 3000,
                    platformFeeCentsCustomer: 2140,
                    payoutCentsCook: 18000,
                    totalWithoutDiscountsCentsCustomer: 23540,
                },
                priceAfter: {
                    platformFeePercentCook: 15,
                    platformFeePercentCustomer: 10,
                    travelExpensesCents: 3000,
                    menuPriceCents: 30000,
                    paymentProviderFeeCents: 600,
                    platformFeeCentsCook: 4500,
                    platformFeeCentsCustomer: 3360,
                    payoutCentsCook: 28500,
                    totalWithoutDiscountsCentsCustomer: 36960,
                },
            }),
            offerEvent('ADMIN_ACCEPTANCE_UPDATED', 'e_accept', {
                userAcceptedBefore: null,
                userAcceptedAfter: true,
                cookAcceptedBefore: true,
                cookAcceptedAfter: true,
            }),
            offerEvent('ADMIN_PAYMENT_SCHEDULE_UPDATED', 'e_pay', {
                paymentStatusBefore: 'EMPTY',
                paymentStatusAfter: 'PAYED_OUT_OF_SYSTEM',
                paymentDateTimeBefore: null,
                paymentDateTimeAfter: null,
                plannedPayoutDateTimeBefore: null,
                plannedPayoutDateTimeAfter: null,
                payoutDateTimeBefore: null,
                payoutDateTimeAfter: null,
            }),
            offerEvent('ADMIN_CONFIGURED_MENU_UPDATED', 'e_menu'),
            offerEvent('ADMIN_HANDED_OVER_TO_COOK', 'e_handover', {
                cookIdBefore: 'cook_old',
                cookNameBefore: 'Old',
                cookIdAfter: 'cook_new',
                cookNameAfter: 'New',
            }),
            offerEvent('ADMIN_PREPARATIONS_CLEARED', 'e_prep'),
        ];

        const forAdmin = toGqlOfferChatMessages({ events, customer, cook, viewerRole: 'admin' });
        const forCook = toGqlOfferChatMessages({ events, customer, cook, viewerRole: 'cook' });
        const forUser = toGqlOfferChatMessages({ events, customer, cook, viewerRole: 'user' });

        expect(forAdmin.map((message) => message.chatMessageId)).toEqual([
            'e_price',
            'e_accept',
            'e_pay',
            'e_menu',
            'e_handover',
            'e_prep',
        ]);
        expect(forCook.map((message) => message.chatMessageId)).toEqual(['e_handover', 'e_prep']);
        expect(forUser.map((message) => message.chatMessageId)).toEqual(['e_handover', 'e_prep']);
    });

    it('keeps payment lifecycle milestones visible to cook and customer', () => {
        const events = [
            offerEvent('SYSTEM_PAYMENT_SETUP', 'e_setup', { amountCents: 23_000 }),
            offerEvent('SYSTEM_PAYMENT_SUCCEEDED', 'e_paid', { amountCents: 23_000, source: 'PULL' }),
            offerEvent('SYSTEM_PAYMENT_FAILED', 'e_fail', { source: 'WEBHOOK' }),
            offerEvent('ADMIN_PAYOUT_RELEASED', 'e_payout', { amountCents: 18_000, source: 'RELEASE' }),
            offerEvent('ADMIN_PAYED_OUT_OF_SYSTEM', 'e_oos', { amountCents: 18_000, source: 'MARK_OUT_OF_SYSTEM' }),
        ];

        const forCook = toGqlOfferChatMessages({ events, customer, cook, viewerRole: 'cook' });
        const forUser = toGqlOfferChatMessages({ events, customer, cook, viewerRole: 'user' });

        expect(forCook.map((message) => message.chatMessageId)).toEqual(['e_setup', 'e_paid', 'e_fail', 'e_payout', 'e_oos']);
        expect(forUser.map((message) => message.chatMessageId)).toEqual(['e_setup', 'e_paid', 'e_fail', 'e_payout', 'e_oos']);
    });
});
