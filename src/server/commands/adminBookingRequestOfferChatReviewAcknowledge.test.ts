import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { adminMutationParent, commandSetup, cookMutationParent, testDb, userMutationParent } from '../test/commandTestUtils';
import { adminBookingRequestOfferChatMessageCreate } from './adminBookingRequestOfferChatMessageCreate';
import { adminBookingRequestOfferChatReviewAcknowledge } from './adminBookingRequestOfferChatReviewAcknowledge';
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
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Review' });
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

function mockChatMessageNotifyJobs(serverRuntime: ServerRuntime, jobId = 'job_chat_notify_1') {
    vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue(jobId);
    vi.mocked(serverRuntime.jobs.cancel).mockResolvedValue(undefined);
}

describe('adminBookingRequestOfferChatReviewAcknowledge', () => {
    it('peer sends bump adminChatReviewPendingCount; admin send does not; acknowledge clears', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerA = await createOffer(cook, bookingRequestId);
        mockChatMessageNotifyJobs(customer.serverRuntime);
        mockChatMessageNotifyJobs(cook.serverRuntime);

        const { customer: customerB, bookingRequestId: bookingRequestIdB } = await insertCustomerBookingRequest();
        const offerB = await createOffer(cook, bookingRequestIdB);
        mockChatMessageNotifyJobs(customerB.serverRuntime);

        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });

        const [afterCreate] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offerA));
        expect(afterCreate?.adminChatReviewPendingCount).toBe(0);

        await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerA, message: 'Hi chef' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        await cookBookingRequestOfferChatMessageCreate(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId: offerA, message: 'Hello' },
            cook.requestingSession,
            cook.serverRuntime,
        );
        await adminBookingRequestOfferChatMessageCreate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId: offerA, message: 'Concierge note' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [afterPeer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerA));
        expect(afterPeer?.adminChatReviewPendingCount).toBe(2);

        await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customerB.user.userId),
            { bookingRequestOfferId: offerB, message: 'Second thread' },
            customerB.requestingSession,
            customerB.serverRuntime,
        );

        const result = await adminBookingRequestOfferChatReviewAcknowledge(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId: offerA },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.acknowledgedOfferId).toBe(offerA);
        // Shared test DB may have other pending offers ahead of offerB.
        if (result.nextOfferId != null) {
            const [next] = await testDb
                .select()
                .from(bookingRequestOffers)
                .where(eq(bookingRequestOffers.bookingRequestOfferId, result.nextOfferId));
            expect(next?.adminChatReviewPendingCount).toBeGreaterThan(0);
            expect(result.nextOfferId).not.toBe(offerA);
        }

        const [reviewedA] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerA));
        expect(reviewedA?.adminChatReviewPendingCount).toBe(0);
        expect(reviewedA?.adminChatReviewedAt).toBeTruthy();

        const [stillPendingB] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offerB));
        expect(stillPendingB?.adminChatReviewPendingCount).toBe(1);

        const clearedB = await adminBookingRequestOfferChatReviewAcknowledge(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId: offerB },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(clearedB.acknowledgedOfferId).toBe(offerB);
        expect(clearedB.nextOfferId).not.toBe(offerB);

        const [reviewedB] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerB));
        expect(reviewedB?.adminChatReviewPendingCount).toBe(0);
    });

    it('acknowledge is idempotent when pending count is already zero', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });

        const result = await adminBookingRequestOfferChatReviewAcknowledge(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId: offerId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.acknowledgedOfferId).toBe(offerId);
        expect(result.nextOfferId).not.toBe(offerId);

        const [offer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer?.adminChatReviewPendingCount).toBe(0);
        expect(offer?.adminChatReviewedAt).toBeNull();
    });
});
