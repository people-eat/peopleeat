import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferEventAttachments,
    bookingRequestOfferEvents,
    bookingRequestParticipants,
    bookingRequests,
    cooks,
} from '../db/schema';
import { adminMutationParent, commandSetup, cookMutationParent, testDb, userMutationParent } from '../test/commandTestUtils';
import { adminBookingRequestOfferChatMessageCreate } from './adminBookingRequestOfferChatMessageCreate';
import { adminBookingRequestOfferChatMessageDelete } from './adminBookingRequestOfferChatMessageDelete';
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

describe('adminBookingRequestOfferChatMessageDelete', () => {
    it('permanently deletes an admin message and cascades attachments', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
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
            { bookingRequestOfferId: offerId, message: 'Ops only', fileUploadIds: [upload.fileUploadId] },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const eventId = created.referenceId!;

        const result = await adminBookingRequestOfferChatMessageDelete(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferEventId: eventId },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result).toEqual({ success: true, referenceId: eventId });

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, eventId))
            .limit(1);
        expect(event).toBeUndefined();

        const attachments = await testDb
            .select()
            .from(bookingRequestOfferEventAttachments)
            .where(eq(bookingRequestOfferEventAttachments.bookingRequestOfferEventId, eventId));
        expect(attachments).toHaveLength(0);

        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('rejects deleting customer or cook messages', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });

        const created = await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, message: 'Peer message' },
            customer.requestingSession,
            customer.serverRuntime,
        );

        await expect(
            adminBookingRequestOfferChatMessageDelete(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferEventId: created.referenceId! },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/only admin messages can be permanently deleted/);
    });
});
