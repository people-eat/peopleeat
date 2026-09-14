import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { BookingRequestOfferEvent } from '../db/schema';
import {
    bookingRequestOfferInitialChatMessageAlreadySeeded,
    bookingRequestOfferInitialMessageResolve,
} from './bookingRequestOfferInitialChatMessage';

function event(partial: Partial<BookingRequestOfferEvent> & Pick<BookingRequestOfferEvent, 'type' | 'payload'>): BookingRequestOfferEvent {
    return {
        bookingRequestOfferEventId: idCreate(),
        bookingRequestOfferId: idCreate(),
        createdAt: new Date('2026-01-01T12:00:00.000Z'),
        ...partial,
    };
}

describe('bookingRequestOfferInitialChatMessage', () => {
    it('prefers adjustedMessage over originalMessage', () => {
        expect(
            bookingRequestOfferInitialMessageResolve({
                originalMessage: ' Original ',
                adjustedMessage: ' Adjusted ',
            }),
        ).toBe('Adjusted');
        expect(
            bookingRequestOfferInitialMessageResolve({
                originalMessage: ' Original ',
                adjustedMessage: null,
            }),
        ).toBe('Original');
    });

    it('detects an existing seed before COOK_CREATED', () => {
        const cookCreatedAt = new Date('2026-01-01T12:00:00.001Z');
        const events = [
            event({
                type: 'USER_MESSAGE_SIMPLE',
                payload: { messageBody: 'Looking for a chef' },
                createdAt: new Date('2026-01-01T12:00:00.000Z'),
            }),
            event({
                type: 'COOK_CREATED',
                payload: { menuTitles: [], menuPriceCents: 1000 },
                createdAt: cookCreatedAt,
            }),
        ];
        expect(bookingRequestOfferInitialChatMessageAlreadySeeded(events, 'Looking for a chef')).toBe(true);
        expect(bookingRequestOfferInitialChatMessageAlreadySeeded(events, 'Different')).toBe(false);
    });

    it('ignores a later customer message that matches the request text', () => {
        const events = [
            event({
                type: 'COOK_CREATED',
                payload: { menuTitles: [], menuPriceCents: 1000 },
                createdAt: new Date('2026-01-01T12:00:00.000Z'),
            }),
            event({
                type: 'USER_MESSAGE_SIMPLE',
                payload: { messageBody: 'Looking for a chef' },
                createdAt: new Date('2026-01-01T13:00:00.000Z'),
            }),
        ];
        expect(bookingRequestOfferInitialChatMessageAlreadySeeded(events, 'Looking for a chef')).toBe(false);
    });
});
