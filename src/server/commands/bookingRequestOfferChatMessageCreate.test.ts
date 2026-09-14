import { and, eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferEventAttachments,
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequestParticipants,
    bookingRequests,
    cooks,
} from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { adminMutationParent, commandSetup, cookMutationParent, testDb, userMutationParent } from '../test/commandTestUtils';
import { adminBookingRequestOfferChatMessageCreate } from './adminBookingRequestOfferChatMessageCreate';
import { cookBookingRequestOfferChatMessageCreate } from './cookBookingRequestOfferChatMessageCreate';
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

function mockChatMessageNotifyJobs(serverRuntime: ServerRuntime, jobId = 'job_chat_notify_1') {
    vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue(jobId);
    vi.mocked(serverRuntime.jobs.cancel).mockResolvedValue(undefined);
}

describe('bookingRequestOfferChatMessageCreate', () => {
    it('user writes USER_MESSAGE_SIMPLE and bumps cook unread', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        mockChatMessageNotifyJobs(customer.serverRuntime, 'job_cook_notify_1');

        const result = await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, message: '  Hi chef  ' },
            customer.requestingSession,
            customer.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, result.referenceId!));
        expect(event?.type).toBe('USER_MESSAGE_SIMPLE');
        expect(event?.payload).toEqual({ messageBody: 'Hi chef' });
        expect(event?.bookingRequestOfferEventId).toBe(result.referenceId);

        const [offer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer?.cookUnreadNotificationCount).toBeGreaterThan(0);
        expect(offer?.adminChatReviewPendingCount).toBe(1);
        expect(offer?.cookChatMessageNotifyJobId).toBe('job_cook_notify_1');
        expect(customer.serverRuntime.jobs.enqueue).toHaveBeenCalledOnce();
    });

    it('cook writes COOK_MESSAGE_SIMPLE and bumps user unread', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        mockChatMessageNotifyJobs(cook.serverRuntime, 'job_customer_notify_1');
        vi.mocked(cook.serverRuntime.jobs.enqueue).mockClear();

        const [before] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        const userUnreadBefore = before!.userUnreadNotificationCount;

        const result = await cookBookingRequestOfferChatMessageCreate(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId: offerId, message: 'Looking forward to it' },
            cook.requestingSession,
            cook.serverRuntime,
        );

        expect(result.success).toBe(true);

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(
                and(
                    eq(bookingRequestOfferEvents.bookingRequestOfferId, offerId),
                    eq(bookingRequestOfferEvents.type, 'COOK_MESSAGE_SIMPLE'),
                ),
            );
        expect(event?.payload).toEqual({ messageBody: 'Looking forward to it' });

        const [offer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer?.userUnreadNotificationCount).toBe(userUnreadBefore + 1);
        expect(offer?.adminChatReviewPendingCount).toBe(1);
        expect(offer?.customerChatMessageNotifyJobId).toBe('job_customer_notify_1');
        expect(cook.serverRuntime.jobs.enqueue).toHaveBeenCalledOnce();
    });

    it('admin writes ADMIN_MESSAGE_SIMPLE and bumps both unread counters', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });

        const [before] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));

        const result = await adminBookingRequestOfferChatMessageCreate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId: offerId, message: 'Please clarify the venue' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(
                and(
                    eq(bookingRequestOfferEvents.bookingRequestOfferId, offerId),
                    eq(bookingRequestOfferEvents.type, 'ADMIN_MESSAGE_SIMPLE'),
                ),
            );
        expect(event?.payload).toEqual({ messageBody: 'Please clarify the venue' });

        const [offer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer?.userUnreadNotificationCount).toBe(before!.userUnreadNotificationCount + 1);
        expect(offer?.cookUnreadNotificationCount).toBe(before!.cookUnreadNotificationCount + 1);
        expect(offer?.adminChatReviewPendingCount).toBe(before!.adminChatReviewPendingCount);
    });

    it('rejects empty message and foreign offer', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const stranger = await commandSetup.withUser({ firstName: 'Other', lastName: 'User' });

        await expect(
            userBookingRequestOfferChatMessageCreate(
                userMutationParent(customer.user.userId),
                { bookingRequestOfferId: offerId, message: '   ' },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/message must not be empty/);

        await expect(
            userBookingRequestOfferChatMessageCreate(
                userMutationParent(stranger.user.userId),
                { bookingRequestOfferId: offerId, message: 'Nope' },
                stranger.requestingSession,
                stranger.serverRuntime,
            ),
        ).rejects.toThrow(/offer not found/);
    });

    it('rejects messages that contain phone numbers', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });

        await expect(
            userBookingRequestOfferChatMessageCreate(
                userMutationParent(customer.user.userId),
                { bookingRequestOfferId: offerId, message: 'Call me at +49 151 12345678' },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/phone numbers are not allowed/);

        await expect(
            cookBookingRequestOfferChatMessageCreate(
                cookMutationParent(cook.user.userId),
                { bookingRequestOfferId: offerId, message: 'Meine Nummer: 0151 12345678' },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/phone numbers are not allowed/);

        await expect(
            adminBookingRequestOfferChatMessageCreate(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferId: offerId, message: 'Reach them at 030/1234567' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/phone numbers are not allowed/);
    });

    it('allows chat after dual-accept', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        mockChatMessageNotifyJobs(customer.serverRuntime);
        mockChatMessageNotifyJobs(cook.serverRuntime);

        await testDb
            .update(bookingRequestOffers)
            .set({ userAccepted: true, cookAccepted: true })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));

        const result = await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, message: 'See you soon' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(result.success).toBe(true);

        const cookResult = await cookBookingRequestOfferChatMessageCreate(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId: offerId, message: 'Looking forward to cooking' },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(cookResult.success).toBe(true);
    });

    it('rejects chat after decline', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);

        await testDb
            .update(bookingRequestOffers)
            .set({ userAccepted: false })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));

        await expect(
            userBookingRequestOfferChatMessageCreate(
                userMutationParent(customer.user.userId),
                { bookingRequestOfferId: offerId, message: 'Still there?' },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/already declined/);
    });

    it('rejects chat after booking request cancel', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);

        await testDb.update(bookingRequests).set({ canceledAt: new Date() }).where(eq(bookingRequests.bookingRequestId, bookingRequestId));

        await expect(
            userBookingRequestOfferChatMessageCreate(
                userMutationParent(customer.user.userId),
                { bookingRequestOfferId: offerId, message: 'Still there?' },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/booking request canceled/);
    });

    it('links owned file uploads to USER_MESSAGE_SIMPLE and allows attachment-only sends', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        mockChatMessageNotifyJobs(customer.serverRuntime);
        const upload = await fileUploadCreate(testDb, {
            userId: customer.user.userId,
            filename: 'menu.pdf',
            mediaType: 'application/pdf',
            bytes: Buffer.from('%PDF-1.4'),
        });

        const result = await userBookingRequestOfferChatMessageCreate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, message: '', fileUploadIds: [upload.fileUploadId] },
            customer.requestingSession,
            customer.serverRuntime,
        );

        expect(result.success).toBe(true);
        const joins = await testDb
            .select()
            .from(bookingRequestOfferEventAttachments)
            .where(eq(bookingRequestOfferEventAttachments.bookingRequestOfferEventId, result.referenceId!));
        expect(joins).toEqual([
            {
                bookingRequestOfferEventId: result.referenceId,
                fileUploadId: upload.fileUploadId,
                position: 0,
            },
        ]);
    });

    it('rejects fileUploadIds owned by a different user', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);
        const other = await commandSetup.withUser({ firstName: 'Other', lastName: 'User' });
        const upload = await fileUploadCreate(testDb, {
            userId: other.user.userId,
            filename: 'stolen.png',
            mediaType: 'image/png',
            bytes: Buffer.from('png'),
        });

        await expect(
            userBookingRequestOfferChatMessageCreate(
                userMutationParent(customer.user.userId),
                { bookingRequestOfferId: offerId, message: 'Hi', fileUploadIds: [upload.fileUploadId] },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/not owned/);
    });
});
