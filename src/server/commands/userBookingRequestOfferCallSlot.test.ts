import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import type { CookCallSlotBookingStatus } from '../domain/bookingRequest';
import { bookingRequestOfferCallSlotReminder } from '../jobs/handlers/bookingRequestOfferCallSlotReminder';
import { bookingRequestOfferCallSlotsComplete } from '../jobs/handlers/bookingRequestOfferCallSlotsComplete';
import { commandSetup, findLogsForSession, testDb, userMutationParent } from '../test/commandTestUtils';
import { userBookingRequestOfferCallSlotCancel } from './userBookingRequestOfferCallSlotCancel';
import { userBookingRequestOfferCallSlotConfirm } from './userBookingRequestOfferCallSlotConfirm';
import { userBookingRequestOfferCallSlotDecline } from './userBookingRequestOfferCallSlotDecline';
import { userBookingRequestOfferCallSlotRequest } from './userBookingRequestOfferCallSlotRequest';

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

const REMINDER_LEAD_MS = 60 * 60_000;
const COMPLETE_GRACE_MS = 15 * 60_000;

type Runtime = Awaited<ReturnType<typeof commandSetup>>['serverRuntime'];

function futureStart(days = 2): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function seedOffer(
    options: {
        callSchedulingEnabled?: boolean;
        callDurationMinutes?: number;
        cookAccepted?: boolean | null;
        userAccepted?: boolean | null;
        canceledAt?: Date | null;
        userUnreadNotificationCount?: number;
        cookUnreadNotificationCount?: number;
    } = {},
) {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'UserSlot' });
    await testDb.insert(cooks).values({
        cookId: cookSetup.user.userId,
        callSchedulingEnabled: options.callSchedulingEnabled ?? true,
        callDurationMinutes: options.callDurationMinutes ?? 30,
    });

    const customerSetup = await commandSetup.withUser({ firstName: 'Customer', lastName: 'UserSlot' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customerSetup.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        canceledAt: options.canceledAt ?? null,
    });

    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cookSetup.user.userId,
        cookAccepted: options.cookAccepted === undefined ? true : options.cookAccepted,
        userAccepted: options.userAccepted === undefined ? null : options.userAccepted,
        menuPriceCents: 25_000,
        travelExpensesCents: 2_000,
        paymentProviderFeeCents: 800,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 4,
        platformFeeCentsCook: 4_500,
        platformFeeCentsCustomer: 1_000,
        payoutCentsCook: 22_500,
        totalWithoutDiscountsCentsCustomer: 28_800,
        paymentStatus: 'EMPTY',
        cookUnreadNotificationCount: options.cookUnreadNotificationCount ?? 0,
        userUnreadNotificationCount: options.userUnreadNotificationCount ?? 0,
    });

    return { cookSetup, customerSetup, bookingRequestId, bookingRequestOfferId };
}

async function insertSlot(args: {
    cookId: string;
    userId: string;
    bookingRequestOfferId: string;
    initiator: 'COOK' | 'CUSTOMER';
    status?: CookCallSlotBookingStatus;
    startAt?: Date;
    endAt?: Date;
}) {
    const startAt = args.startAt ?? futureStart();
    const endAt = args.endAt ?? new Date(startAt.getTime() + 30 * 60_000);
    const cookCallSlotBookingId = idCreate();
    await testDb.insert(cookCallSlotBookings).values({
        cookCallSlotBookingId,
        cookId: args.cookId,
        userId: args.userId,
        bookingRequestOfferId: args.bookingRequestOfferId,
        initiator: args.initiator,
        status: args.status ?? 'PENDING',
        startAt,
        endAt,
    });
    return { cookCallSlotBookingId, startAt, endAt };
}

function expectNoMutationSideEffects(serverRuntime: Runtime) {
    expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.email.send).not.toHaveBeenCalled();
    expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    expect(serverRuntime.slack.postMessage).not.toHaveBeenCalled();
}

async function expectErrorLogged(sessionId: string, message: RegExp) {
    const logRows = await findLogsForSession(sessionId);
    expect(logRows.some((row) => row.level === 'error' && message.test(row.message))).toBe(true);
}

async function expectNoErrorLog(sessionId: string) {
    const logRows = await findLogsForSession(sessionId);
    expect(logRows.filter((row) => row.level === 'error')).toHaveLength(0);
}

function expectPartiesPublished(serverRuntime: Runtime, customerUserId: string, cookId: string) {
    expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customerUserId });
    expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cookId });
    expect(serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    expect(serverRuntime.slack.postMessage).not.toHaveBeenCalled();
}

describe('userBookingRequestOfferCallSlotRequest', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ lastAcceptedPrivacyPolicy: null });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotRequest(
                userMutationParent(user.userId),
                { bookingRequestOfferId: idCreate(), startAt: futureStart(), customerMessage: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        expectNoMutationSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects an invalid startAt before touching the offer', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Invalid' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotRequest(
                userMutationParent(user.userId),
                { bookingRequestOfferId: idCreate(), startAt: new Date(Number.NaN), customerMessage: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotRequest: invalid startAt');

        expectNoMutationSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects a startAt that is not in the future', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Past' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotRequest(
                userMutationParent(user.userId),
                { bookingRequestOfferId: idCreate(), startAt: new Date(Date.now() - 60_000), customerMessage: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotRequest: startAt must be in the future');

        expectNoMutationSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects when the offer id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Missing' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotRequest(
                userMutationParent(user.userId),
                { bookingRequestOfferId: idCreate(), startAt: futureStart(), customerMessage: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotRequest: offer not found');

        expectNoMutationSideEffects(serverRuntime);
        await expectErrorLogged(requestingSession.sessionId, /offer not found/);
    });

    it('rejects when the offer belongs to another customer', async () => {
        // Arrange
        const fixture = await seedOffer();
        const stranger = await commandSetup.withUser({ firstName: 'Stranger', lastName: 'Guest' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotRequest(
                userMutationParent(stranger.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt: futureStart(), customerMessage: 'Hello' },
                stranger.requestingSession,
                stranger.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotRequest: offer not found');

        const slots = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(slots).toHaveLength(0);
        expectNoMutationSideEffects(stranger.serverRuntime);
        await expectErrorLogged(stranger.requestingSession.sessionId, /offer not found/);
    });

    it('rejects when the customer has already declined the offer', async () => {
        // Arrange
        const fixture = await seedOffer({ userAccepted: false });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotRequest(
                userMutationParent(fixture.customerSetup.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt: futureStart(), customerMessage: null },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: offer already declined');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /offer already declined/);
    });

    it('rejects when the booking request is canceled', async () => {
        // Arrange
        const fixture = await seedOffer({ canceledAt: new Date() });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotRequest(
                userMutationParent(fixture.customerSetup.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt: futureStart(), customerMessage: null },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: booking request canceled');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /booking request canceled/);
    });

    it('rejects when cook call scheduling is disabled', async () => {
        // Arrange
        const fixture = await seedOffer({ callSchedulingEnabled: false });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotRequest(
                userMutationParent(fixture.customerSetup.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt: futureStart(), customerMessage: null },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotRequest: cook call scheduling disabled');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /call scheduling disabled/);
    });

    it('rejects when the offer already has a confirmed slot', async () => {
        // Arrange
        const fixture = await seedOffer();
        await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
            status: 'CONFIRMED',
            startAt: futureStart(10),
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotRequest(
                userMutationParent(fixture.customerSetup.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt: futureStart(3), customerMessage: null },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotRequest: offer already has a CONFIRMED call slot');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /CONFIRMED call slot/);
    });

    it('rejects when the cook already has an overlapping pending or confirmed slot', async () => {
        // Arrange
        const fixture = await seedOffer();
        const startAt = futureStart(4);
        await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
            status: 'PENDING',
            startAt,
            endAt: new Date(startAt.getTime() + 30 * 60_000),
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotRequest(
                userMutationParent(fixture.customerSetup.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt, customerMessage: null },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('cookCallSlotCalendarOverlapAssert: overlapping PENDING/CONFIRMED booking');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /overlapping PENDING\/CONFIRMED booking/);
    });

    it('requests a pending customer slot, stores the message, and notifies the cook', async () => {
        // Arrange
        const fixture = await seedOffer({ cookUnreadNotificationCount: 4 });
        const startAt = futureStart(3);
        const endAt = new Date(startAt.getTime() + 30 * 60_000);

        // Act
        const result = await userBookingRequestOfferCallSlotRequest(
            userMutationParent(fixture.customerSetup.user.userId),
            { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt, customerMessage: '  Can we talk menu?  ' },
            fixture.customerSetup.requestingSession,
            fixture.customerSetup.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const cookCallSlotBookingId = result.referenceId ?? '';
        const [slot] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingId));
        expect(slot).toMatchObject({
            status: 'PENDING',
            initiator: 'CUSTOMER',
            customerMessage: 'Can we talk menu?',
            cookMessage: null,
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            startAt,
            endAt,
        });

        const [offer] = await testDb
            .select({ cookUnreadNotificationCount: bookingRequestOffers.cookUnreadNotificationCount })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(offer?.cookUnreadNotificationCount).toBe(5);

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.type).toBe('USER_CALL_SLOT_REQUESTED');
        expect(event?.payload).toEqual({
            cookCallSlotBookingId,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            customerMessage: 'Can we talk menu?',
        });

        expectPartiesPublished(fixture.customerSetup.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
        expect(fixture.customerSetup.serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: fixture.cookSetup.user.emailAddress,
                purpose: 'CALL_SLOT_BOOKING_REQUEST',
                userId: fixture.cookSetup.user.userId,
            }),
        );
        expect(fixture.customerSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledTimes(1);
        expect(fixture.customerSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledWith(
            bookingRequestOfferCallSlotsComplete,
            { cookCallSlotBookingId },
            { startAfter: endAt },
        );
    });

    it('stores a blank customer message as null and omits it from the event payload', async () => {
        // Arrange
        const fixture = await seedOffer();
        const startAt = futureStart(5);

        // Act
        const result = await userBookingRequestOfferCallSlotRequest(
            userMutationParent(fixture.customerSetup.user.userId),
            { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt, customerMessage: '   ' },
            fixture.customerSetup.requestingSession,
            fixture.customerSetup.serverRuntime,
        );

        // Assert
        const cookCallSlotBookingId = result.referenceId ?? '';
        const [slot] = await testDb
            .select({ customerMessage: cookCallSlotBookings.customerMessage })
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingId));
        expect(slot?.customerMessage).toBeNull();

        const [event] = await testDb
            .select({ payload: bookingRequestOfferEvents.payload })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.payload).toEqual({
            cookCallSlotBookingId,
            startAt: startAt.toISOString(),
            endAt: new Date(startAt.getTime() + 30 * 60_000).toISOString(),
        });
        expect(fixture.customerSetup.serverRuntime.email.send).toHaveBeenCalledOnce();
        expect(fixture.customerSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledOnce();
        expectPartiesPublished(fixture.customerSetup.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });
});

describe('userBookingRequestOfferCallSlotConfirm', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ lastAcceptedPrivacyPolicy: null });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotConfirm(
                userMutationParent(user.userId),
                { cookCallSlotBookingId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        expectNoMutationSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects when the slot id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Customer', lastName: 'ConfirmMiss' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotConfirm(
                userMutationParent(user.userId),
                { cookCallSlotBookingId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotConfirm: booking not found');

        expectNoMutationSideEffects(serverRuntime);
        await expectErrorLogged(requestingSession.sessionId, /booking not found/);
    });

    it('rejects when the slot belongs to another customer', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });
        const stranger = await commandSetup.withUser({ firstName: 'Stranger', lastName: 'Confirm' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotConfirm(
                userMutationParent(stranger.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId },
                stranger.requestingSession,
                stranger.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotConfirm: booking not found');

        const [row] = await testDb
            .select({ status: cookCallSlotBookings.status })
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row?.status).toBe('PENDING');
        expectNoMutationSideEffects(stranger.serverRuntime);
        await expectErrorLogged(stranger.requestingSession.sessionId, /booking not found/);
    });

    it('rejects when the customer has already declined the offer', async () => {
        // Arrange
        const fixture = await seedOffer({ userAccepted: false });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotConfirm(
                userMutationParent(fixture.customerSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: offer already declined');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /offer already declined/);
    });

    it('rejects when the booking request is canceled', async () => {
        // Arrange
        const fixture = await seedOffer({ canceledAt: new Date() });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotConfirm(
                userMutationParent(fixture.customerSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: booking request canceled');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /booking request canceled/);
    });

    it('rejects when the slot is not pending', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
            status: 'DECLINED',
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotConfirm(
                userMutationParent(fixture.customerSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotConfirm: booking is not PENDING');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /not PENDING/);
    });

    it('rejects when the customer tries to confirm a customer-initiated slot', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotConfirm(
                userMutationParent(fixture.customerSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotConfirm: only cook-initiated slots can be confirmed by customer');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /only cook-initiated/);
    });

    it('confirms a cook slot, cancels sibling pending slots, and schedules reminder plus completion', async () => {
        // Arrange
        const fixture = await seedOffer({ cookUnreadNotificationCount: 2 });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
            startAt: futureStart(4),
        });
        const sibling = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
            startAt: futureStart(5),
        });

        // Act
        const result = await userBookingRequestOfferCallSlotConfirm(
            userMutationParent(fixture.customerSetup.user.userId),
            { cookCallSlotBookingId: slot.cookCallSlotBookingId },
            fixture.customerSetup.requestingSession,
            fixture.customerSetup.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: slot.cookCallSlotBookingId });
        const rows = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.bookingRequestOfferId, fixture.bookingRequestOfferId));
        const confirmed = rows.find((row) => row.cookCallSlotBookingId === slot.cookCallSlotBookingId);
        const canceled = rows.find((row) => row.cookCallSlotBookingId === sibling.cookCallSlotBookingId);
        expect(confirmed?.status).toBe('CONFIRMED');
        expect(canceled).toMatchObject({ status: 'CANCELED', canceledBy: 'CUSTOMER', canceledReason: 'ANOTHER_SLOT_CONFIRMED' });

        const [offer] = await testDb
            .select({ cookUnreadNotificationCount: bookingRequestOffers.cookUnreadNotificationCount })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(offer?.cookUnreadNotificationCount).toBe(3);

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(events.find((event) => event.type === 'USER_CALL_SLOT_CONFIRMED')?.payload).toMatchObject({
            cookCallSlotBookingId: slot.cookCallSlotBookingId,
        });
        expect(events.find((event) => event.type === 'USER_CALL_SLOT_CANCELLED')?.payload).toMatchObject({
            cookCallSlotBookingId: sibling.cookCallSlotBookingId,
            wasConfirmed: false,
            reason: 'ANOTHER_SLOT_CONFIRMED',
        });

        expect(fixture.customerSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledWith(
            bookingRequestOfferCallSlotReminder,
            { cookCallSlotBookingId: slot.cookCallSlotBookingId },
            { startAfter: new Date(slot.startAt.getTime() - REMINDER_LEAD_MS) },
        );
        expect(fixture.customerSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledWith(
            bookingRequestOfferCallSlotsComplete,
            { cookCallSlotBookingId: slot.cookCallSlotBookingId },
            { startAfter: new Date(slot.endAt.getTime() + COMPLETE_GRACE_MS) },
        );
        expect(fixture.customerSetup.serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: fixture.cookSetup.user.emailAddress,
                purpose: 'CALL_SLOT_BOOKING_CONFIRM',
                userId: fixture.cookSetup.user.userId,
            }),
        );
        expectPartiesPublished(fixture.customerSetup.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });

    it('skips the reminder enqueue when the call starts inside the lead time', async () => {
        // Arrange
        const fixture = await seedOffer();
        const startAt = new Date(Date.now() + 30 * 60_000);
        const endAt = new Date(startAt.getTime() + 30 * 60_000);
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
            startAt,
            endAt,
        });

        // Act
        await userBookingRequestOfferCallSlotConfirm(
            userMutationParent(fixture.customerSetup.user.userId),
            { cookCallSlotBookingId: slot.cookCallSlotBookingId },
            fixture.customerSetup.requestingSession,
            fixture.customerSetup.serverRuntime,
        );

        // Assert
        expect(fixture.customerSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledTimes(1);
        expect(fixture.customerSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledWith(
            bookingRequestOfferCallSlotsComplete,
            { cookCallSlotBookingId: slot.cookCallSlotBookingId },
            { startAfter: new Date(endAt.getTime() + COMPLETE_GRACE_MS) },
        );
        const events = await testDb
            .select({ type: bookingRequestOfferEvents.type })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(events.map((event) => event.type)).toEqual(['USER_CALL_SLOT_CONFIRMED']);
    });
});

describe('userBookingRequestOfferCallSlotDecline', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ lastAcceptedPrivacyPolicy: null });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotDecline(
                userMutationParent(user.userId),
                { cookCallSlotBookingId: idCreate(), reason: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        expectNoMutationSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects when the slot id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Customer', lastName: 'DeclineMiss' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotDecline(
                userMutationParent(user.userId),
                { cookCallSlotBookingId: idCreate(), reason: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotDecline: booking not found');

        expectNoMutationSideEffects(serverRuntime);
        await expectErrorLogged(requestingSession.sessionId, /booking not found/);
    });

    it('rejects when the slot belongs to another customer', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });
        const stranger = await commandSetup.withUser({ firstName: 'Stranger', lastName: 'Decline' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotDecline(
                userMutationParent(stranger.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: 'No' },
                stranger.requestingSession,
                stranger.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotDecline: booking not found');

        const [row] = await testDb
            .select({ status: cookCallSlotBookings.status })
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row?.status).toBe('PENDING');
        expectNoMutationSideEffects(stranger.serverRuntime);
        await expectErrorLogged(stranger.requestingSession.sessionId, /booking not found/);
    });

    it('rejects when the customer has already declined the offer', async () => {
        // Arrange
        const fixture = await seedOffer({ userAccepted: false });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotDecline(
                userMutationParent(fixture.customerSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: offer already declined');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /offer already declined/);
    });

    it('rejects when the booking request is canceled', async () => {
        // Arrange
        const fixture = await seedOffer({ canceledAt: new Date() });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotDecline(
                userMutationParent(fixture.customerSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: booking request canceled');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /booking request canceled/);
    });

    it('rejects when the slot is not pending', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
            status: 'CONFIRMED',
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotDecline(
                userMutationParent(fixture.customerSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotDecline: booking is not PENDING');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /not PENDING/);
    });

    it('rejects when the customer tries to decline a customer-initiated slot', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotDecline(
                userMutationParent(fixture.customerSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotDecline: only cook-initiated slots can be declined by customer');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /only cook-initiated/);
    });

    it('declines a cook slot with a reason and emails the cook', async () => {
        // Arrange
        const fixture = await seedOffer({ cookUnreadNotificationCount: 1 });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });

        // Act
        const result = await userBookingRequestOfferCallSlotDecline(
            userMutationParent(fixture.customerSetup.user.userId),
            { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: '  Not a fit  ' },
            fixture.customerSetup.requestingSession,
            fixture.customerSetup.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: slot.cookCallSlotBookingId });
        const [row] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row).toMatchObject({ status: 'DECLINED', declineReason: 'Not a fit' });

        const [offer] = await testDb
            .select({ cookUnreadNotificationCount: bookingRequestOffers.cookUnreadNotificationCount })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(offer?.cookUnreadNotificationCount).toBe(2);

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.type).toBe('USER_CALL_SLOT_DECLINED');
        expect(event?.payload).toMatchObject({
            cookCallSlotBookingId: slot.cookCallSlotBookingId,
            declineReason: 'Not a fit',
        });
        expect(fixture.customerSetup.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(fixture.customerSetup.serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: fixture.cookSetup.user.emailAddress,
                purpose: 'CALL_SLOT_BOOKING_DECLINE',
                userId: fixture.cookSetup.user.userId,
            }),
        );
        expectPartiesPublished(fixture.customerSetup.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });

    it('stores a blank decline reason as null and omits it from the event', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });

        // Act
        await userBookingRequestOfferCallSlotDecline(
            userMutationParent(fixture.customerSetup.user.userId),
            { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: '   ' },
            fixture.customerSetup.requestingSession,
            fixture.customerSetup.serverRuntime,
        );

        // Assert
        const [row] = await testDb
            .select({ declineReason: cookCallSlotBookings.declineReason })
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row?.declineReason).toBeNull();
        const [event] = await testDb
            .select({ payload: bookingRequestOfferEvents.payload })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.payload).not.toHaveProperty('declineReason');
        expect(fixture.customerSetup.serverRuntime.email.send).toHaveBeenCalledOnce();
    });
});

describe('userBookingRequestOfferCallSlotCancel', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ lastAcceptedPrivacyPolicy: null });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotCancel(
                userMutationParent(user.userId),
                { cookCallSlotBookingId: idCreate(), reason: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        expectNoMutationSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects when the slot id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Customer', lastName: 'CancelMiss' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotCancel(
                userMutationParent(user.userId),
                { cookCallSlotBookingId: idCreate(), reason: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotCancel: booking not found');

        expectNoMutationSideEffects(serverRuntime);
        await expectErrorLogged(requestingSession.sessionId, /booking not found/);
    });

    it('rejects when the slot belongs to another customer', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
        });
        const stranger = await commandSetup.withUser({ firstName: 'Stranger', lastName: 'Cancel' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotCancel(
                userMutationParent(stranger.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                stranger.requestingSession,
                stranger.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotCancel: booking not found');

        const [row] = await testDb
            .select({ status: cookCallSlotBookings.status })
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row?.status).toBe('PENDING');
        expectNoMutationSideEffects(stranger.serverRuntime);
        await expectErrorLogged(stranger.requestingSession.sessionId, /booking not found/);
    });

    it('rejects when the customer has already declined the offer', async () => {
        // Arrange
        const fixture = await seedOffer({ userAccepted: false });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotCancel(
                userMutationParent(fixture.customerSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: offer already declined');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /offer already declined/);
    });

    it('rejects when the booking request is canceled', async () => {
        // Arrange
        const fixture = await seedOffer({ canceledAt: new Date() });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotCancel(
                userMutationParent(fixture.customerSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: booking request canceled');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /booking request canceled/);
    });

    it('rejects when the slot is neither pending nor confirmed', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
            status: 'DECLINED',
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallSlotCancel(
                userMutationParent(fixture.customerSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallSlotCancel: booking is not PENDING or CONFIRMED');

        expectNoMutationSideEffects(fixture.customerSetup.serverRuntime);
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /not PENDING or CONFIRMED/);
    });

    it('cancels a pending slot and records that it was not confirmed', async () => {
        // Arrange
        const fixture = await seedOffer({ cookUnreadNotificationCount: 6 });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
        });

        // Act
        const result = await userBookingRequestOfferCallSlotCancel(
            userMutationParent(fixture.customerSetup.user.userId),
            { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: '  Schedule changed  ' },
            fixture.customerSetup.requestingSession,
            fixture.customerSetup.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: slot.cookCallSlotBookingId });
        const [row] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row).toMatchObject({ status: 'CANCELED', canceledBy: 'CUSTOMER', canceledReason: 'Schedule changed' });

        const [offer] = await testDb
            .select({ cookUnreadNotificationCount: bookingRequestOffers.cookUnreadNotificationCount })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(offer?.cookUnreadNotificationCount).toBe(7);

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.type).toBe('USER_CALL_SLOT_CANCELLED');
        expect(event?.payload).toMatchObject({
            cookCallSlotBookingId: slot.cookCallSlotBookingId,
            wasConfirmed: false,
            reason: 'Schedule changed',
        });
        expect(fixture.customerSetup.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(fixture.customerSetup.serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: fixture.cookSetup.user.emailAddress,
                purpose: 'CALL_SLOT_BOOKING_CANCEL',
                userId: fixture.cookSetup.user.userId,
            }),
        );
        expectPartiesPublished(fixture.customerSetup.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });

    it('cancels a confirmed slot and records wasConfirmed when the reason is blank', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
            status: 'CONFIRMED',
        });

        // Act
        await userBookingRequestOfferCallSlotCancel(
            userMutationParent(fixture.customerSetup.user.userId),
            { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: '   ' },
            fixture.customerSetup.requestingSession,
            fixture.customerSetup.serverRuntime,
        );

        // Assert
        const [row] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row).toMatchObject({ status: 'CANCELED', canceledBy: 'CUSTOMER', canceledReason: null });
        const [event] = await testDb
            .select({ payload: bookingRequestOfferEvents.payload })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.payload).toMatchObject({ wasConfirmed: true });
        expect(event?.payload).not.toHaveProperty('reason');
        expect(fixture.customerSetup.serverRuntime.email.send).toHaveBeenCalledOnce();
        expect(fixture.customerSetup.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    });
});
