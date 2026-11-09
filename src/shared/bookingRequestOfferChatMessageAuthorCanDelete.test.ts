import { describe, expect, it } from 'vitest';

import {
    BOOKING_REQUEST_OFFER_CHAT_MESSAGE_AUTHOR_DELETE_WINDOW_MS,
    bookingRequestOfferChatMessageAuthorCanDelete,
} from './bookingRequestOfferChatMessageAuthorCanDelete';

describe('bookingRequestOfferChatMessageAuthorCanDelete', () => {
    it('allows delete immediately after send', () => {
        const createdAt = new Date('2026-11-09T10:00:00.000Z');
        expect(bookingRequestOfferChatMessageAuthorCanDelete(createdAt, createdAt)).toBe(true);
    });

    it('allows delete just before the window closes', () => {
        const createdAt = new Date('2026-11-09T10:00:00.000Z');
        const now = new Date(createdAt.getTime() + BOOKING_REQUEST_OFFER_CHAT_MESSAGE_AUTHOR_DELETE_WINDOW_MS - 1);
        expect(bookingRequestOfferChatMessageAuthorCanDelete(createdAt, now)).toBe(true);
    });

    it('rejects delete at and after the 1 hour mark', () => {
        const createdAt = new Date('2026-11-09T10:00:00.000Z');
        const atWindow = new Date(createdAt.getTime() + BOOKING_REQUEST_OFFER_CHAT_MESSAGE_AUTHOR_DELETE_WINDOW_MS);
        const afterWindow = new Date(createdAt.getTime() + BOOKING_REQUEST_OFFER_CHAT_MESSAGE_AUTHOR_DELETE_WINDOW_MS + 1);
        expect(bookingRequestOfferChatMessageAuthorCanDelete(createdAt, atWindow)).toBe(false);
        expect(bookingRequestOfferChatMessageAuthorCanDelete(createdAt, afterWindow)).toBe(false);
    });
});
