import { and, asc, eq, inArray } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    admins,
    bookingRequestOfferEventAttachments,
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequests,
    cooks,
    fileUploads,
} from '../db/schema';
import { bookingRequestOfferStatusDerive } from '../domain/bookingRequest';
import { toGqlOfferChatMessages } from '../mappers/toGqlOfferChatMessages';
import { toGqlPublicUser } from '../mappers/toGqlPublicUser';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferHandover } from './adminBookingRequestOfferHandover';

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

async function setupHandoverFixture(paymentStatus: 'EMPTY' | 'PAYED' | 'PAYED_OUT_OF_SYSTEM' | 'TRANSFERRED' = 'PAYED_OUT_OF_SYSTEM') {
    const admin = await commandSetup.withUser({ firstName: 'handover-admin', lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });

    const cookA = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Alpha' });
    await testDb.insert(cooks).values({
        cookId: cookA.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_source',
        stripeAccountActive: true,
    });

    const cookB = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Bravo' });
    await testDb.insert(cooks).values({
        cookId: cookB.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_target',
        stripeAccountActive: true,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });

    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cookA.user.userId,
        cookAccepted: true,
        userAccepted: true,
        menuPriceCents: 25_000,
        travelExpensesCents: 2_000,
        paymentProviderFeeCents: 800,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 4,
        platformFeeCentsCook: 4_500,
        platformFeeCentsCustomer: 1_000,
        payoutCentsCook: 22_500,
        totalWithoutDiscountsCentsCustomer: 28_800,
        paymentStatus,
        paymentData: paymentStatus === 'PAYED' ? { transferId: 'tr_source' } : null,
        configuredMenu: {
            menuId: undefined,
            title: 'Tasting',
            description: 'Three courses',
            courses: [{ title: 'Starter', meals: [{ mealTitle: 'Soup', mealDescription: 'Warm' }] }],
        },
    });

    return { admin, cookA, cookB, customer, bookingRequestId, bookingRequestOfferId };
}

async function seedSourceChat(bookingRequestOfferId: string, customerUserId: string) {
    const userMessageId = idCreate();
    const cookMessageId = idCreate();
    const adminMessageId = idCreate();
    const t0 = new Date('2026-01-10T10:00:00.000Z');
    const t1 = new Date('2026-01-10T10:05:00.000Z');
    const t2 = new Date('2026-01-10T10:10:00.000Z');

    await testDb.insert(bookingRequestOfferEvents).values([
        {
            bookingRequestOfferEventId: userMessageId,
            bookingRequestOfferId,
            type: 'USER_MESSAGE_SIMPLE' as const,
            payload: { messageBody: 'Looking for a chef' },
            createdAt: t0,
        },
        {
            bookingRequestOfferEventId: cookMessageId,
            bookingRequestOfferId,
            type: 'COOK_MESSAGE_SIMPLE' as const,
            payload: { messageBody: 'Happy to cook for you' },
            createdAt: t1,
        },
        {
            bookingRequestOfferEventId: adminMessageId,
            bookingRequestOfferId,
            type: 'ADMIN_MESSAGE_SIMPLE' as const,
            payload: { messageBody: 'Concierge note', hiddenByAdmin: true },
            createdAt: t2,
        },
        {
            bookingRequestOfferEventId: idCreate(),
            bookingRequestOfferId,
            type: 'COOK_ACCEPTED' as const,
            payload: {},
            createdAt: new Date('2026-01-10T10:15:00.000Z'),
        },
    ]);

    const fileUploadId = idCreate();
    const bytes = Buffer.from('attachment');
    await testDb.insert(fileUploads).values({
        fileUploadId,
        userId: customerUserId,
        filename: 'menu.pdf',
        mediaType: 'application/pdf',
        size: bytes.byteLength,
        bytes,
    });
    await testDb.insert(bookingRequestOfferEventAttachments).values({
        bookingRequestOfferEventId: userMessageId,
        fileUploadId,
        position: 0,
    });

    return { userMessageId, cookMessageId, adminMessageId, fileUploadId, t0, t1, t2 };
}

describe('adminBookingRequestOfferHandover', () => {
    it('closes the old offer and creates a dual-accepted offer for the new cook', async () => {
        const { admin, cookA, cookB, bookingRequestOfferId } = await setupHandoverFixture('PAYED_OUT_OF_SYSTEM');

        const result = await adminBookingRequestOfferHandover(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    bookingRequestOfferId,
                    cookId: cookB.user.userId,
                    copyPrice: true,
                    copyConfiguredMenu: true,
                    copyScheduleTimestamps: true,
                    copyChatMessages: false,
                    confirmOutOfSystemMoneyHandled: true,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        expect(result.referenceId).not.toBe(bookingRequestOfferId);

        const [oldOffer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(oldOffer?.userAccepted).toBe(false);
        expect(oldOffer?.cookAccepted).toBe(false);
        expect(oldOffer?.paymentStatus).toBe('EMPTY');
        expect(oldOffer?.paymentData).toBeNull();
        expect(oldOffer?.paymentDateTime).toBeNull();
        expect(oldOffer?.plannedPaymentPullDateTime).toBeNull();
        expect(oldOffer?.plannedPayoutDateTime).toBeNull();

        const [bookingRequest] = await testDb
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, oldOffer!.bookingRequestId));
        expect(
            bookingRequestOfferStatusDerive({
                userAccepted: oldOffer!.userAccepted,
                cookAccepted: oldOffer!.cookAccepted,
                userRequestedMenuAdjustments: oldOffer!.userRequestedMenuAdjustments,
                paymentStatus: oldOffer!.paymentStatus,
                paymentDataPresent: Boolean(oldOffer!.paymentData),
                bookingRequestCanceledAt: bookingRequest!.canceledAt,
                bookingRequestExpiresAt: bookingRequest!.expiresAt,
                bookingRequestDateTime: bookingRequest!.dateTime,
                hasAcceptedAlternative: true,
            }),
        ).toBe('USER_CHOOSE_DIFFERENT_OFFER');

        const [newOffer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, result.referenceId!));
        expect(newOffer?.cookId).toBe(cookB.user.userId);
        expect(newOffer?.userAccepted).toBe(true);
        expect(newOffer?.cookAccepted).toBe(true);
        expect(newOffer?.paymentStatus).toBe('PAYED_OUT_OF_SYSTEM');
        expect(newOffer?.configuredMenu?.title).toBe('Tasting');

        const closedEvents = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(
                and(
                    eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId),
                    eq(bookingRequestOfferEvents.type, 'ADMIN_HANDED_OVER_CLOSED'),
                ),
            );
        expect(closedEvents).toHaveLength(1);

        const openedEvents = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(
                and(
                    eq(bookingRequestOfferEvents.bookingRequestOfferId, result.referenceId!),
                    eq(bookingRequestOfferEvents.type, 'ADMIN_HANDED_OVER_TO_COOK'),
                ),
            );
        expect(openedEvents).toHaveLength(1);
        expect(openedEvents[0]?.payload).toMatchObject({
            cookIdBefore: cookA.user.userId,
            cookIdAfter: cookB.user.userId,
        });
        expect(openedEvents[0]?.payload).not.toHaveProperty('chatCopied');
    });

    it('blocks TRANSFERRED offers', async () => {
        const { admin, cookB, bookingRequestOfferId } = await setupHandoverFixture('TRANSFERRED');

        await expect(
            adminBookingRequestOfferHandover(
                adminMutationParent(admin.user.userId),
                {
                    input: {
                        bookingRequestOfferId,
                        cookId: cookB.user.userId,
                        copyPrice: true,
                        copyConfiguredMenu: false,
                        copyScheduleTimestamps: false,
                        copyChatMessages: false,
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/TRANSFERRED/);
    });

    it('requires confirmOutOfSystemMoneyHandled for PAYED_OUT_OF_SYSTEM', async () => {
        const { admin, cookB, bookingRequestOfferId } = await setupHandoverFixture('PAYED_OUT_OF_SYSTEM');

        await expect(
            adminBookingRequestOfferHandover(
                adminMutationParent(admin.user.userId),
                {
                    input: {
                        bookingRequestOfferId,
                        cookId: cookB.user.userId,
                        copyPrice: true,
                        copyConfiguredMenu: false,
                        copyScheduleTimestamps: false,
                        copyChatMessages: false,
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/confirmOutOfSystemMoneyHandled/);
    });

    it('reverses and re-transfers for PAYED offers', async () => {
        const { admin, cookB, bookingRequestOfferId } = await setupHandoverFixture('PAYED');
        vi.mocked(admin.serverRuntime.stripe.transferReverse).mockResolvedValue(undefined);
        vi.mocked(admin.serverRuntime.stripe.transferCreate).mockResolvedValue({ transferId: 'tr_new' });

        const result = await adminBookingRequestOfferHandover(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    bookingRequestOfferId,
                    cookId: cookB.user.userId,
                    copyPrice: true,
                    copyConfiguredMenu: false,
                    copyScheduleTimestamps: true,
                    copyChatMessages: false,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(admin.serverRuntime.stripe.transferReverse).toHaveBeenCalledWith({ transferId: 'tr_source' });
        expect(admin.serverRuntime.stripe.transferCreate).toHaveBeenCalledWith(
            expect.objectContaining({ destinationAccountId: 'acct_target' }),
        );

        const [oldOffer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(oldOffer?.paymentStatus).toBe('EMPTY');
        expect(oldOffer?.paymentData).toBeNull();

        const [newOffer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, result.referenceId!));
        expect(newOffer?.paymentStatus).toBe('PAYED');
        expect(newOffer?.paymentData).toMatchObject({ transferId: 'tr_new' });
    });

    it('copies MESSAGE_SIMPLE events with cook provenance and attachment re-links when copyChatMessages is true', async () => {
        const { admin, cookA, cookB, customer, bookingRequestOfferId } = await setupHandoverFixture('PAYED_OUT_OF_SYSTEM');
        const { cookMessageId, fileUploadId, t0, t1, t2 } = await seedSourceChat(bookingRequestOfferId, customer.user.userId);

        const result = await adminBookingRequestOfferHandover(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    bookingRequestOfferId,
                    cookId: cookB.user.userId,
                    copyPrice: true,
                    copyConfiguredMenu: false,
                    copyScheduleTimestamps: false,
                    copyChatMessages: true,
                    confirmOutOfSystemMoneyHandled: true,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        const targetOfferId = result.referenceId!;

        const targetEvents = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, targetOfferId))
            .orderBy(asc(bookingRequestOfferEvents.createdAt), asc(bookingRequestOfferEvents.bookingRequestOfferEventId));

        const messageEvents = targetEvents.filter((event) =>
            ['USER_MESSAGE_SIMPLE', 'COOK_MESSAGE_SIMPLE', 'ADMIN_MESSAGE_SIMPLE'].includes(event.type),
        );
        expect(messageEvents).toHaveLength(3);
        expect(messageEvents.map((event) => (event.payload as { messageBody: string }).messageBody)).toEqual([
            'Looking for a chef',
            'Happy to cook for you',
            'Concierge note',
        ]);

        // No duplicate booking-request seed when chat is copied onto a new offer.
        const userBodies = messageEvents
            .filter((event) => event.type === 'USER_MESSAGE_SIMPLE')
            .map((event) => (event.payload as { messageBody: string }).messageBody);
        expect(userBodies).toEqual(['Looking for a chef']);

        // System events from the source offer are not copied.
        expect(targetEvents.some((event) => event.type === 'COOK_ACCEPTED')).toBe(false);

        const cookCopy = messageEvents.find((event) => event.type === 'COOK_MESSAGE_SIMPLE');
        expect(cookCopy?.payload).toMatchObject({
            messageBody: 'Happy to cook for you',
            originalCreatedAt: t1.toISOString(),
            handedOverFrom: {
                cookId: cookA.user.userId,
                cookDisplayName: 'Chef Alpha',
                sourceEventId: cookMessageId,
            },
        });

        const adminCopy = messageEvents.find((event) => event.type === 'ADMIN_MESSAGE_SIMPLE');
        expect(adminCopy?.payload).toMatchObject({
            messageBody: 'Concierge note',
            hiddenByAdmin: true,
            originalCreatedAt: t2.toISOString(),
        });

        const userCopy = messageEvents.find((event) => event.type === 'USER_MESSAGE_SIMPLE');
        expect(userCopy?.payload).toMatchObject({
            messageBody: 'Looking for a chef',
            originalCreatedAt: t0.toISOString(),
        });
        expect(userCopy?.payload).not.toHaveProperty('handedOverFrom');

        const handoverEvent = targetEvents.find((event) => event.type === 'ADMIN_HANDED_OVER_TO_COOK');
        expect(handoverEvent?.payload).toMatchObject({ chatCopied: true });

        // Copied messages form a contiguous block immediately before the handover event.
        const handoverIndex = targetEvents.findIndex((event) => event.type === 'ADMIN_HANDED_OVER_TO_COOK');
        expect(handoverIndex).toBeGreaterThanOrEqual(3);
        expect(targetEvents.slice(handoverIndex - 3, handoverIndex).map((event) => event.type)).toEqual([
            'USER_MESSAGE_SIMPLE',
            'COOK_MESSAGE_SIMPLE',
            'ADMIN_MESSAGE_SIMPLE',
        ]);

        const copiedUserEventId = userCopy!.bookingRequestOfferEventId;
        const attachmentJoins = await testDb
            .select()
            .from(bookingRequestOfferEventAttachments)
            .where(eq(bookingRequestOfferEventAttachments.bookingRequestOfferEventId, copiedUserEventId));
        expect(attachmentJoins).toEqual([
            expect.objectContaining({
                bookingRequestOfferEventId: copiedUserEventId,
                fileUploadId,
                position: 0,
            }),
        ]);

        // Mapper keeps prior cook attribution and original send time for the new cook viewer.
        const gqlMessages = toGqlOfferChatMessages({
            events: messageEvents,
            customer: toGqlPublicUser(customer.user),
            cook: toGqlPublicUser(cookB.user),
            viewerRole: 'cook',
        });
        const cookGql = gqlMessages.find(
            (message) => message.gqlTypeName === 'ChatMessageUser' && message.body === 'Happy to cook for you',
        );
        expect(cookGql).toMatchObject({
            gqlTypeName: 'ChatMessageUser',
            author: { display: 'Chef Alpha' },
            isOwn: false,
            createdAt: t1,
        });
        expect(cookGql?.gqlTypeName === 'ChatMessageUser' && cookGql.author.display).not.toBe('Chef');
    });

    it('does not copy chat when copyChatMessages is false', async () => {
        const { admin, cookB, customer, bookingRequestOfferId } = await setupHandoverFixture('PAYED_OUT_OF_SYSTEM');
        await seedSourceChat(bookingRequestOfferId, customer.user.userId);

        const result = await adminBookingRequestOfferHandover(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    bookingRequestOfferId,
                    cookId: cookB.user.userId,
                    copyPrice: true,
                    copyConfiguredMenu: false,
                    copyScheduleTimestamps: false,
                    copyChatMessages: false,
                    confirmOutOfSystemMoneyHandled: true,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const targetEvents = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, result.referenceId!));

        const copiedCookMessages = targetEvents.filter((event) => event.type === 'COOK_MESSAGE_SIMPLE');
        expect(copiedCookMessages).toHaveLength(0);

        const handoverEvent = targetEvents.find((event) => event.type === 'ADMIN_HANDED_OVER_TO_COOK');
        expect(handoverEvent?.payload).not.toHaveProperty('chatCopied');

        // New offer still gets the usual booking-request seed.
        const userMessages = targetEvents.filter((event) => event.type === 'USER_MESSAGE_SIMPLE');
        expect(userMessages).toHaveLength(1);
        expect((userMessages[0]?.payload as { messageBody: string }).messageBody).toBe('Looking for a chef');
    });

    it('keeps copied chat as a contiguous block when upgrading an existing target offer', async () => {
        const { admin, cookA, cookB, customer, bookingRequestId, bookingRequestOfferId } =
            await setupHandoverFixture('PAYED_OUT_OF_SYSTEM');
        await seedSourceChat(bookingRequestOfferId, customer.user.userId);

        const existingTargetOfferId = idCreate();
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: existingTargetOfferId,
            bookingRequestId,
            cookId: cookB.user.userId,
            cookAccepted: false,
            userAccepted: null,
            menuPriceCents: 20_000,
            travelExpensesCents: 1_500,
            paymentProviderFeeCents: 700,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 4,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 800,
            payoutCentsCook: 18_000,
            totalWithoutDiscountsCentsCustomer: 23_000,
            paymentStatus: 'EMPTY',
        });
        await testDb.insert(bookingRequestOfferEvents).values({
            bookingRequestOfferEventId: idCreate(),
            bookingRequestOfferId: existingTargetOfferId,
            type: 'COOK_CREATED',
            payload: { menuTitles: [], menuPriceCents: 20_000, totalWithoutDiscountsCentsCustomer: 23_000 },
            createdAt: new Date('2026-01-01T09:00:00.000Z'),
        });
        await testDb.insert(bookingRequestOfferEvents).values({
            bookingRequestOfferEventId: idCreate(),
            bookingRequestOfferId: existingTargetOfferId,
            type: 'COOK_MESSAGE_SIMPLE',
            payload: { messageBody: 'Earlier note from Bravo' },
            createdAt: new Date('2026-01-01T09:05:00.000Z'),
        });

        const result = await adminBookingRequestOfferHandover(
            adminMutationParent(admin.user.userId),
            {
                input: {
                    bookingRequestOfferId,
                    cookId: cookB.user.userId,
                    copyPrice: true,
                    copyConfiguredMenu: false,
                    copyScheduleTimestamps: false,
                    copyChatMessages: true,
                    confirmOutOfSystemMoneyHandled: true,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.referenceId).toBe(existingTargetOfferId);

        const targetEvents = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, existingTargetOfferId))
            .orderBy(asc(bookingRequestOfferEvents.createdAt), asc(bookingRequestOfferEvents.bookingRequestOfferEventId));

        const handoverIndex = targetEvents.findIndex((event) => event.type === 'ADMIN_HANDED_OVER_TO_COOK');
        expect(handoverIndex).toBeGreaterThanOrEqual(3);
        const block = targetEvents.slice(handoverIndex - 3, handoverIndex);
        expect(block.map((event) => (event.payload as { messageBody?: string }).messageBody)).toEqual([
            'Looking for a chef',
            'Happy to cook for you',
            'Concierge note',
        ]);
        expect(block.some((event) => event.type === 'COOK_MESSAGE_SIMPLE' && 'handedOverFrom' in (event.payload as object))).toBe(true);

        const priorBravoMessages = targetEvents.filter(
            (event) =>
                event.type === 'COOK_MESSAGE_SIMPLE' &&
                (event.payload as { messageBody: string }).messageBody === 'Earlier note from Bravo',
        );
        expect(priorBravoMessages).toHaveLength(1);

        // Copied cook message still points at cook A, not the upgraded cook B history.
        const copiedCook = block.find((event) => event.type === 'COOK_MESSAGE_SIMPLE');
        expect(copiedCook?.payload).toMatchObject({
            handedOverFrom: { cookId: cookA.user.userId, cookDisplayName: 'Chef Alpha' },
        });

        const sourceMessageIds = await testDb
            .select({ bookingRequestOfferEventId: bookingRequestOfferEvents.bookingRequestOfferEventId })
            .from(bookingRequestOfferEvents)
            .where(
                and(
                    eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId),
                    inArray(bookingRequestOfferEvents.type, ['USER_MESSAGE_SIMPLE', 'COOK_MESSAGE_SIMPLE', 'ADMIN_MESSAGE_SIMPLE']),
                ),
            );
        expect(sourceMessageIds).toHaveLength(3);
    });
});
