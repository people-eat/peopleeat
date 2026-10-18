import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferEventReactions,
    bookingRequestOfferEvents,
    bookingRequestParticipants,
    bookingRequests,
    cooks,
    featureToggles,
} from '../db/schema';
import { commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { bookingRequestOfferChatMessageReactionUpsert } from './bookingRequestOfferChatMessageReactionUpsert';
import { cookBookingRequestOfferCreate } from './cookBookingRequestOfferCreate';

const berlin = {
    displayText: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10115',
    state: 'BE',
    country: 'DE',
};

async function featureToggleSet(enabled: boolean): Promise<void> {
    await testDb.insert(featureToggles).values({ featureToggleKey: 'BOOKING_REQUEST_OFFER_CHAT_REACTIONS', enabled }).onConflictDoUpdate({
        target: featureToggles.featureToggleKey,
        set: { enabled },
    });
}

async function offerFixture() {
    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'React' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_test',
        stripeAccountActive: true,
    });
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: { ...berlin, latitude: 52.53, longitude: 13.41 },
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: ['vegetarian'],
        expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    });
    await testDb.insert(bookingRequestParticipants).values({
        bookingRequestParticipantId: idCreate(),
        bookingRequestId,
        type: 'ADULT',
        name: 'Participant 1',
        restrictions: [],
    });
    const created = await cookBookingRequestOfferCreate(
        cookMutationParent(cook.user.userId),
        { input: { bookingRequestId, suggestedMenuIds: [], menuPriceCents: 20_000 } },
        cook.requestingSession,
        cook.serverRuntime,
    );
    return { customer, cook, bookingRequestOfferId: created.referenceId! };
}

describe('bookingRequestOfferChatMessageReactionUpsert', () => {
    it('rejects when the feature toggle is off', async () => {
        await featureToggleSet(false);
        const { customer, bookingRequestOfferId } = await offerFixture();
        const eventId = idCreate();
        await testDb.insert(bookingRequestOfferEvents).values({
            bookingRequestOfferEventId: eventId,
            bookingRequestOfferId,
            type: 'COOK_MESSAGE_SIMPLE',
            payload: { messageBody: 'Hallo' },
        });

        await expect(
            bookingRequestOfferChatMessageReactionUpsert(
                {
                    reactorUserId: customer.user.userId,
                    reactorRole: 'USER',
                    bookingRequestOfferEventId: eventId,
                    emoji: '👍',
                },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/feature is disabled/);
    });

    it('upserts and clears a customer reaction when the toggle is on', async () => {
        await featureToggleSet(true);
        const { customer, bookingRequestOfferId } = await offerFixture();
        const eventId = idCreate();
        await testDb.insert(bookingRequestOfferEvents).values({
            bookingRequestOfferEventId: eventId,
            bookingRequestOfferId,
            type: 'COOK_MESSAGE_SIMPLE',
            payload: { messageBody: 'Menüvorschlag' },
        });

        const result = await bookingRequestOfferChatMessageReactionUpsert(
            {
                reactorUserId: customer.user.userId,
                reactorRole: 'USER',
                bookingRequestOfferEventId: eventId,
                emoji: '👍',
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(result).toEqual({ success: true, referenceId: eventId });

        const [reaction] = await testDb
            .select()
            .from(bookingRequestOfferEventReactions)
            .where(eq(bookingRequestOfferEventReactions.bookingRequestOfferEventId, eventId));
        expect(reaction?.emoji).toBe('👍');
        expect(reaction?.reactorRole).toBe('USER');

        await bookingRequestOfferChatMessageReactionUpsert(
            {
                reactorUserId: customer.user.userId,
                reactorRole: 'USER',
                bookingRequestOfferEventId: eventId,
                emoji: '',
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const [cleared] = await testDb
            .select()
            .from(bookingRequestOfferEventReactions)
            .where(eq(bookingRequestOfferEventReactions.bookingRequestOfferEventId, eventId));
        expect(cleared?.emoji).toBeNull();
    });
});
