import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferEventAttachments,
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequestParticipants,
    bookingRequests,
    cooks,
} from '../db/schema';
import { adminMutationParent, commandSetup, cookMutationParent, testDb, userMutationParent } from '../test/commandTestUtils';
import { adminBookingRequestOfferChatMessageCreate } from './adminBookingRequestOfferChatMessageCreate';
import { adminBookingRequestOfferChatMessageUpdate } from './adminBookingRequestOfferChatMessageUpdate';
import { cookBookingRequestOfferCreate } from './cookBookingRequestOfferCreate';
import { fileUploadCreate } from './fileUploadCreate';
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

describe('adminBookingRequestOfferChatMessageUpdate', () => {
    it('updates a simple message body and publishes peer updates', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });

        const created = await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, message: 'Original body' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const eventId = created.referenceId!;

        const result = await adminBookingRequestOfferChatMessageUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferEventId: eventId, message: '  Corrected body  ' },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result).toEqual({ success: true, referenceId: eventId });

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, eventId))
            .limit(1);
        expect(event?.payload).toMatchObject({ messageBody: 'Corrected body' });

        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('allows edit after decline and rejects phone numbers', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });

        const created = await adminBookingRequestOfferChatMessageCreate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId: offerId, message: 'Ops note' },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const eventId = created.referenceId!;

        await testDb
            .update(bookingRequestOffers)
            .set({ userAccepted: false })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));

        const result = await adminBookingRequestOfferChatMessageUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferEventId: eventId, message: 'Fixed after decline' },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result.success).toBe(true);

        await expect(
            adminBookingRequestOfferChatMessageUpdate(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferEventId: eventId, message: 'Call +49 151 12345678' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/phone numbers are not allowed/);
    });

    it('rejects empty body without attachments and non-simple events', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });

        const created = await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, message: 'Keep me' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        const eventId = created.referenceId!;

        await expect(
            adminBookingRequestOfferChatMessageUpdate(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferEventId: eventId, message: '   ' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/message must not be empty/);

        const [cookCreated] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(and(eq(bookingRequestOfferEvents.bookingRequestOfferId, offerId), eq(bookingRequestOfferEvents.type, 'COOK_CREATED')))
            .limit(1);
        expect(cookCreated).toBeTruthy();

        await expect(
            adminBookingRequestOfferChatMessageUpdate(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferEventId: cookCreated!.bookingRequestOfferEventId, message: 'Nope' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/only simple chat messages can be edited/);
    });

    it('allows clearing body when attachments remain', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });

        const upload = await fileUploadCreate(testDb, {
            userId: admin.user.userId,
            filename: 'note.pdf',
            mediaType: 'application/pdf',
            bytes: Buffer.from('%PDF-1.4'),
        });
        const created = await adminBookingRequestOfferChatMessageCreate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId: offerId, message: 'See attachment', fileUploadIds: [upload.fileUploadId] },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const eventId = created.referenceId!;

        const [attachment] = await testDb
            .select()
            .from(bookingRequestOfferEventAttachments)
            .where(eq(bookingRequestOfferEventAttachments.bookingRequestOfferEventId, eventId))
            .limit(1);
        expect(attachment).toBeTruthy();

        const result = await adminBookingRequestOfferChatMessageUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferEventId: eventId, message: '' },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, eventId))
            .limit(1);
        expect(event?.payload).toMatchObject({ messageBody: '' });
    });
});
