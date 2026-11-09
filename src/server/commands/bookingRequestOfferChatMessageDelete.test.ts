import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { BOOKING_REQUEST_OFFER_CHAT_MESSAGE_AUTHOR_DELETE_WINDOW_MS } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestParticipants, bookingRequests, cooks } from '../db/schema';
import { toGqlOfferChatMessages } from '../mappers/toGqlOfferChatMessages';
import { commandSetup, cookMutationParent, testDb, userMutationParent } from '../test/commandTestUtils';
import { bookingRequestOfferChatMessageDelete } from './bookingRequestOfferChatMessageDelete';
import { cookBookingRequestOfferChatMessageCreate } from './cookBookingRequestOfferChatMessageCreate';
import { cookBookingRequestOfferCreate } from './cookBookingRequestOfferCreate';
import { userBookingRequestOfferChatMessageCreate } from './userBookingRequestOfferChatMessageCreate';

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

async function setupCookReadyToOffer() {
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Offer' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_test',
        stripeAccountActive: true,
    });
    return setup;
}

async function insertCustomerBookingRequest() {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: {
            ...berlin,
            latitude: 52.53,
            longitude: 13.41,
        },
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
    return { customer, bookingRequestId };
}

async function createOffer(cook: Awaited<ReturnType<typeof setupCookReadyToOffer>>, bookingRequestId: string) {
    const created = await cookBookingRequestOfferCreate(
        cookMutationParent(cook.user.userId),
        { input: { bookingRequestId, suggestedMenuIds: [], menuPriceCents: 20_000 } },
        cook.requestingSession,
        cook.serverRuntime,
    );
    return created.referenceId!;
}

const publicUser = { display: 'Someone', createdAt: new Date(0), profilePicture: null };

describe('bookingRequestOfferChatMessageDelete', () => {
    it('soft-deletes a customer message for peers and keeps it for admin', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);

        const created = await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, message: 'Please retract me' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const eventId = created.referenceId!;

        const result = await bookingRequestOfferChatMessageDelete(
            { actorUserId: customer.user.userId, actorRole: 'USER', bookingRequestOfferEventId: eventId },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(result).toEqual({ success: true, referenceId: eventId });

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, eventId))
            .limit(1);
        expect(event?.payload).toMatchObject({ messageBody: 'Please retract me', hiddenByAuthor: true });

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, offerId));

        const userMessages = toGqlOfferChatMessages({
            events,
            customer: publicUser,
            cook: publicUser,
            viewerRole: 'user',
        });
        const cookMessages = toGqlOfferChatMessages({
            events,
            customer: publicUser,
            cook: publicUser,
            viewerRole: 'cook',
        });
        const adminMessages = toGqlOfferChatMessages({
            events,
            customer: publicUser,
            cook: publicUser,
            viewerRole: 'admin',
        });

        expect(userMessages.some((message) => message.chatMessageId === eventId)).toBe(false);
        expect(cookMessages.some((message) => message.chatMessageId === eventId)).toBe(false);
        const adminBubble = adminMessages.find((message) => message.chatMessageId === eventId);
        expect(adminBubble?.gqlTypeName).toBe('ChatMessageUser');
        if (adminBubble?.gqlTypeName === 'ChatMessageUser') {
            expect(adminBubble.hiddenByAuthor).toBe(true);
            expect(adminBubble.canSoftDelete).toBe(false);
        }

        expect(customer.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(customer.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('soft-deletes a cook message', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);

        const created = await cookBookingRequestOfferChatMessageCreate(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId: offerId, message: 'Cook retract' },
            cook.requestingSession,
            cook.serverRuntime,
        );
        const eventId = created.referenceId!;

        const result = await bookingRequestOfferChatMessageDelete(
            { actorUserId: cook.user.userId, actorRole: 'COOK', bookingRequestOfferEventId: eventId },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, eventId))
            .limit(1);
        expect(event?.payload).toMatchObject({ hiddenByAuthor: true });
    });

    it('rejects deleting another party’s message', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);

        const created = await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, message: 'Customer note' },
            customer.requestingSession,
            customer.serverRuntime,
        );

        await expect(
            bookingRequestOfferChatMessageDelete(
                { actorUserId: cook.user.userId, actorRole: 'COOK', bookingRequestOfferEventId: created.referenceId! },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/only own messages can be deleted/);
    });

    it('rejects a second delete', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);

        const created = await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, message: 'Once' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const eventId = created.referenceId!;

        await bookingRequestOfferChatMessageDelete(
            { actorUserId: customer.user.userId, actorRole: 'USER', bookingRequestOfferEventId: eventId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        await expect(
            bookingRequestOfferChatMessageDelete(
                { actorUserId: customer.user.userId, actorRole: 'USER', bookingRequestOfferEventId: eventId },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/message already deleted/);
    });

    it('rejects delete after the 1 hour window', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);

        const created = await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, message: 'Too late' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const eventId = created.referenceId!;

        await testDb
            .update(bookingRequestOfferEvents)
            .set({ createdAt: new Date(Date.now() - BOOKING_REQUEST_OFFER_CHAT_MESSAGE_AUTHOR_DELETE_WINDOW_MS) })
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, eventId));

        await expect(
            bookingRequestOfferChatMessageDelete(
                { actorUserId: customer.user.userId, actorRole: 'USER', bookingRequestOfferEventId: eventId },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/delete window has expired/);
    });

    it('rejects non-simple events', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);

        const offerEvents = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, offerId));
        const milestone = offerEvents.find((event) => event.type === 'COOK_CREATED');
        expect(milestone).toBeTruthy();

        await expect(
            bookingRequestOfferChatMessageDelete(
                {
                    actorUserId: customer.user.userId,
                    actorRole: 'USER',
                    bookingRequestOfferEventId: milestone!.bookingRequestOfferEventId,
                },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/only own messages can be deleted/);
    });
});
