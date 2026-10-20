import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestParticipants, bookingRequests, cooks } from '../db/schema';
import { toGqlOfferChatMessages } from '../mappers/toGqlOfferChatMessages';
import { adminMutationParent, commandSetup, cookMutationParent, testDb, userMutationParent } from '../test/commandTestUtils';
import { adminBookingRequestOfferChatMessageVisibilityUpdate } from './adminBookingRequestOfferChatMessageVisibilityUpdate';
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

describe('adminBookingRequestOfferChatMessageVisibilityUpdate', () => {
    it('hides a simple message for peers and publishes updates', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });

        const created = await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, message: 'Please hide me' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const eventId = created.referenceId!;

        const result = await adminBookingRequestOfferChatMessageVisibilityUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferEventId: eventId, hiddenByAdmin: true },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result).toEqual({ success: true, referenceId: eventId });

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, eventId))
            .limit(1);
        expect(event?.payload).toMatchObject({ messageBody: 'Please hide me', hiddenByAdmin: true });

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
            expect(adminBubble.hiddenByAdmin).toBe(true);
            expect(adminBubble.canHardDelete).toBe(false);
        }

        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('unhides a message and clears the payload flag', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });

        const created = await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, message: 'Temporary hide' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const eventId = created.referenceId!;

        await adminBookingRequestOfferChatMessageVisibilityUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferEventId: eventId, hiddenByAdmin: true },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const result = await adminBookingRequestOfferChatMessageVisibilityUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferEventId: eventId, hiddenByAdmin: false },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, eventId))
            .limit(1);
        expect(event?.payload).toEqual({ messageBody: 'Temporary hide' });

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
        expect(userMessages.some((message) => message.chatMessageId === eventId)).toBe(true);
    });

    it('rejects non-simple events', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });

        const offerEvents = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, offerId));
        const milestone = offerEvents.find((event) => event.type === 'COOK_CREATED');
        expect(milestone).toBeTruthy();

        await expect(
            adminBookingRequestOfferChatMessageVisibilityUpdate(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferEventId: milestone!.bookingRequestOfferEventId, hiddenByAdmin: true },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/only simple chat messages can be hidden/);
    });
});
