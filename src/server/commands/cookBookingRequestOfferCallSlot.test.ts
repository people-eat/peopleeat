import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import type { CookCallSlotBookingStatus } from '../domain/bookingRequest';
import { bookingRequestOfferCallSlotReminder } from '../jobs/handlers/bookingRequestOfferCallSlotReminder';
import { bookingRequestOfferCallSlotsComplete } from '../jobs/handlers/bookingRequestOfferCallSlotsComplete';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookBookingRequestOfferCallSlotCancel } from './cookBookingRequestOfferCallSlotCancel';
import { cookBookingRequestOfferCallSlotConfirm } from './cookBookingRequestOfferCallSlotConfirm';
import { cookBookingRequestOfferCallSlotDecline } from './cookBookingRequestOfferCallSlotDecline';
import { cookBookingRequestOfferCallSlotRequest } from './cookBookingRequestOfferCallSlotRequest';

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
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Slot' });
    await testDb.insert(cooks).values({
        cookId: cookSetup.user.userId,
        callSchedulingEnabled: options.callSchedulingEnabled ?? true,
        callDurationMinutes: options.callDurationMinutes ?? 30,
    });

    const customerSetup = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Slot' });
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

function expectPartiesPublished(serverRuntime: Runtime, cookId: string, customerUserId: string) {
    expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cookId });
    expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customerUserId });
    expect(serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
    expect(serverRuntime.slack.postMessage).not.toHaveBeenCalled();
}

describe('cookBookingRequestOfferCallSlotRequest', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ lastAcceptedPrivacyPolicy: null });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotRequest(
                cookMutationParent(user.userId),
                { bookingRequestOfferId: idCreate(), startAt: futureStart(), cookMessage: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        expectNoMutationSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects an invalid startAt before touching the offer', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Invalid' });
        await testDb.insert(cooks).values({ cookId: user.userId, callSchedulingEnabled: true });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotRequest(
                cookMutationParent(user.userId),
                { bookingRequestOfferId: idCreate(), startAt: new Date(Number.NaN), cookMessage: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotRequest: invalid startAt');

        expectNoMutationSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects a startAt that is not in the future', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Past' });
        await testDb.insert(cooks).values({ cookId: user.userId, callSchedulingEnabled: true });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotRequest(
                cookMutationParent(user.userId),
                { bookingRequestOfferId: idCreate(), startAt: new Date(Date.now() - 60_000), cookMessage: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotRequest: startAt must be in the future');

        expectNoMutationSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects when the offer id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Missing' });
        await testDb.insert(cooks).values({ cookId: user.userId, callSchedulingEnabled: true });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotRequest(
                cookMutationParent(user.userId),
                { bookingRequestOfferId: idCreate(), startAt: futureStart(), cookMessage: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotRequest: offer not found');

        expectNoMutationSideEffects(serverRuntime);
        await expectErrorLogged(requestingSession.sessionId, /offer not found/);
    });

    it('rejects when the offer belongs to another cook', async () => {
        // Arrange
        const fixture = await seedOffer();
        const otherCook = await commandSetup.withUser({ firstName: 'Other', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: otherCook.user.userId, callSchedulingEnabled: true });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotRequest(
                cookMutationParent(otherCook.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt: futureStart(), cookMessage: 'Hello' },
                otherCook.requestingSession,
                otherCook.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotRequest: offer not found');

        const slots = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(slots).toHaveLength(0);
        expectNoMutationSideEffects(otherCook.serverRuntime);
        await expectErrorLogged(otherCook.requestingSession.sessionId, /offer not found/);
    });

    it('rejects when the offer is already declined', async () => {
        // Arrange
        const fixture = await seedOffer({ cookAccepted: false });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotRequest(
                cookMutationParent(fixture.cookSetup.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt: futureStart(), cookMessage: null },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: offer already declined');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /offer already declined/);
    });

    it('rejects when the booking request is canceled', async () => {
        // Arrange
        const fixture = await seedOffer({ canceledAt: new Date() });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotRequest(
                cookMutationParent(fixture.cookSetup.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt: futureStart(), cookMessage: null },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: booking request canceled');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /booking request canceled/);
    });

    it('rejects when cook call scheduling is disabled', async () => {
        // Arrange
        const fixture = await seedOffer({ callSchedulingEnabled: false });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotRequest(
                cookMutationParent(fixture.cookSetup.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt: futureStart(), cookMessage: null },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotRequest: cook call scheduling disabled');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /call scheduling disabled/);
    });

    it('rejects when the offer already has a confirmed slot', async () => {
        // Arrange
        const fixture = await seedOffer();
        await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
            status: 'CONFIRMED',
            startAt: futureStart(10),
        });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotRequest(
                cookMutationParent(fixture.cookSetup.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt: futureStart(3), cookMessage: null },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotRequest: offer already has a CONFIRMED call slot');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /CONFIRMED call slot/);
    });

    it('rejects when the cook already has an overlapping pending or confirmed slot', async () => {
        // Arrange
        const fixture = await seedOffer();
        const startAt = futureStart(4);
        await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
            status: 'PENDING',
            startAt,
            endAt: new Date(startAt.getTime() + 30 * 60_000),
        });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotRequest(
                cookMutationParent(fixture.cookSetup.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt, cookMessage: null },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('cookCallSlotCalendarOverlapAssert: overlapping PENDING/CONFIRMED booking');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /overlapping PENDING\/CONFIRMED booking/);
    });

    it('requests a pending cook slot, stores the message, and notifies the customer', async () => {
        // Arrange
        const fixture = await seedOffer({ userUnreadNotificationCount: 4 });
        const startAt = futureStart(3);
        const endAt = new Date(startAt.getTime() + 30 * 60_000);

        // Act
        const result = await cookBookingRequestOfferCallSlotRequest(
            cookMutationParent(fixture.cookSetup.user.userId),
            { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt, cookMessage: '  Can we talk menu?  ' },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
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
            initiator: 'COOK',
            cookMessage: 'Can we talk menu?',
            customerMessage: null,
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            startAt,
            endAt,
        });

        const [offer] = await testDb
            .select({ userUnreadNotificationCount: bookingRequestOffers.userUnreadNotificationCount })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(offer?.userUnreadNotificationCount).toBe(5);

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.type).toBe('COOK_CALL_SLOT_REQUESTED');
        expect(event?.payload).toEqual({
            cookCallSlotBookingId,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            cookMessage: 'Can we talk menu?',
        });

        expectPartiesPublished(fixture.cookSetup.serverRuntime, fixture.cookSetup.user.userId, fixture.customerSetup.user.userId);
        expect(fixture.cookSetup.serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: fixture.customerSetup.user.emailAddress,
                purpose: 'CALL_SLOT_BOOKING_REQUEST',
                userId: fixture.customerSetup.user.userId,
            }),
        );
        expect(fixture.cookSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledTimes(1);
        expect(fixture.cookSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledWith(
            bookingRequestOfferCallSlotsComplete,
            { cookCallSlotBookingId },
            { startAfter: endAt },
        );
    });

    it('stores a blank cook message as null and omits it from the event payload', async () => {
        // Arrange
        const fixture = await seedOffer();
        const startAt = futureStart(5);

        // Act
        const result = await cookBookingRequestOfferCallSlotRequest(
            cookMutationParent(fixture.cookSetup.user.userId),
            { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt, cookMessage: '   ' },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        const cookCallSlotBookingId = result.referenceId ?? '';
        const [slot] = await testDb
            .select({ cookMessage: cookCallSlotBookings.cookMessage })
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingId));
        expect(slot?.cookMessage).toBeNull();

        const [event] = await testDb
            .select({ payload: bookingRequestOfferEvents.payload })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.payload).toEqual({
            cookCallSlotBookingId,
            startAt: startAt.toISOString(),
            endAt: new Date(startAt.getTime() + 30 * 60_000).toISOString(),
        });
        expect(fixture.cookSetup.serverRuntime.email.send).toHaveBeenCalledOnce();
        expect(fixture.cookSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledOnce();
        expectPartiesPublished(fixture.cookSetup.serverRuntime, fixture.cookSetup.user.userId, fixture.customerSetup.user.userId);
    });

    it('allows a request that only overlaps a declined slot', async () => {
        // Arrange
        const fixture = await seedOffer();
        const startAt = futureStart(6);
        const declined = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
            status: 'DECLINED',
            startAt,
        });

        // Act
        const result = await cookBookingRequestOfferCallSlotRequest(
            cookMutationParent(fixture.cookSetup.user.userId),
            { bookingRequestOfferId: fixture.bookingRequestOfferId, startAt, cookMessage: null },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const slots = await testDb
            .select({ id: cookCallSlotBookings.cookCallSlotBookingId, status: cookCallSlotBookings.status })
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(slots).toEqual(
            expect.arrayContaining([
                { id: declined.cookCallSlotBookingId, status: 'DECLINED' },
                { id: result.referenceId, status: 'PENDING' },
            ]),
        );
        expect(fixture.cookSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledOnce();
    });
});

describe('cookBookingRequestOfferCallSlotConfirm', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ lastAcceptedPrivacyPolicy: null });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotConfirm(
                cookMutationParent(user.userId),
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
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'ConfirmMiss' });
        await testDb.insert(cooks).values({ cookId: user.userId });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotConfirm(
                cookMutationParent(user.userId),
                { cookCallSlotBookingId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotConfirm: booking not found');

        expectNoMutationSideEffects(serverRuntime);
        await expectErrorLogged(requestingSession.sessionId, /booking not found/);
    });

    it('rejects when the slot belongs to another cook', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
        });
        const otherCook = await commandSetup.withUser({ firstName: 'Other', lastName: 'Confirm' });
        await testDb.insert(cooks).values({ cookId: otherCook.user.userId });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotConfirm(
                cookMutationParent(otherCook.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId },
                otherCook.requestingSession,
                otherCook.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotConfirm: booking not found');

        const [row] = await testDb
            .select({ status: cookCallSlotBookings.status })
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row?.status).toBe('PENDING');
        expectNoMutationSideEffects(otherCook.serverRuntime);
        await expectErrorLogged(otherCook.requestingSession.sessionId, /booking not found/);
    });

    it('rejects when the offer is already declined', async () => {
        // Arrange
        const fixture = await seedOffer({ cookAccepted: false });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
        });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotConfirm(
                cookMutationParent(fixture.cookSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: offer already declined');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /offer already declined/);
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
            cookBookingRequestOfferCallSlotConfirm(
                cookMutationParent(fixture.cookSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: booking request canceled');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /booking request canceled/);
    });

    it('rejects when the slot is not pending', async () => {
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
            cookBookingRequestOfferCallSlotConfirm(
                cookMutationParent(fixture.cookSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotConfirm: booking is not PENDING');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /not PENDING/);
    });

    it('rejects when the cook tries to confirm a cook-initiated slot', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotConfirm(
                cookMutationParent(fixture.cookSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotConfirm: only customer-initiated slots can be confirmed by cook');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /only customer-initiated/);
    });

    it('confirms a customer slot, cancels sibling pending slots, and schedules reminder plus completion', async () => {
        // Arrange
        const fixture = await seedOffer({ userUnreadNotificationCount: 2 });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
            startAt: futureStart(4),
        });
        const sibling = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
            startAt: futureStart(5),
        });

        // Act
        const result = await cookBookingRequestOfferCallSlotConfirm(
            cookMutationParent(fixture.cookSetup.user.userId),
            { cookCallSlotBookingId: slot.cookCallSlotBookingId },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
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
        expect(canceled).toMatchObject({ status: 'CANCELED', canceledBy: 'COOK', canceledReason: 'ANOTHER_SLOT_CONFIRMED' });

        const [offer] = await testDb
            .select({ userUnreadNotificationCount: bookingRequestOffers.userUnreadNotificationCount })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(offer?.userUnreadNotificationCount).toBe(3);

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(events.find((event) => event.type === 'COOK_CALL_SLOT_CONFIRMED')?.payload).toMatchObject({
            cookCallSlotBookingId: slot.cookCallSlotBookingId,
        });
        expect(events.find((event) => event.type === 'COOK_CALL_SLOT_CANCELLED')?.payload).toMatchObject({
            cookCallSlotBookingId: sibling.cookCallSlotBookingId,
            wasConfirmed: false,
            reason: 'ANOTHER_SLOT_CONFIRMED',
        });

        expect(fixture.cookSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledWith(
            bookingRequestOfferCallSlotReminder,
            { cookCallSlotBookingId: slot.cookCallSlotBookingId },
            { startAfter: new Date(slot.startAt.getTime() - REMINDER_LEAD_MS) },
        );
        expect(fixture.cookSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledWith(
            bookingRequestOfferCallSlotsComplete,
            { cookCallSlotBookingId: slot.cookCallSlotBookingId },
            { startAfter: new Date(slot.endAt.getTime() + COMPLETE_GRACE_MS) },
        );
        expect(fixture.cookSetup.serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: fixture.customerSetup.user.emailAddress,
                purpose: 'CALL_SLOT_BOOKING_CONFIRM',
                userId: fixture.customerSetup.user.userId,
            }),
        );
        expectPartiesPublished(fixture.cookSetup.serverRuntime, fixture.cookSetup.user.userId, fixture.customerSetup.user.userId);
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
            initiator: 'CUSTOMER',
            startAt,
            endAt,
        });

        // Act
        await cookBookingRequestOfferCallSlotConfirm(
            cookMutationParent(fixture.cookSetup.user.userId),
            { cookCallSlotBookingId: slot.cookCallSlotBookingId },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(fixture.cookSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledTimes(1);
        expect(fixture.cookSetup.serverRuntime.jobs.enqueue).toHaveBeenCalledWith(
            bookingRequestOfferCallSlotsComplete,
            { cookCallSlotBookingId: slot.cookCallSlotBookingId },
            { startAfter: new Date(endAt.getTime() + COMPLETE_GRACE_MS) },
        );
        const events = await testDb
            .select({ type: bookingRequestOfferEvents.type })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(events.map((event) => event.type)).toEqual(['COOK_CALL_SLOT_CONFIRMED']);
    });
});

describe('cookBookingRequestOfferCallSlotDecline', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ lastAcceptedPrivacyPolicy: null });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotDecline(
                cookMutationParent(user.userId),
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
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'DeclineMiss' });
        await testDb.insert(cooks).values({ cookId: user.userId });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotDecline(
                cookMutationParent(user.userId),
                { cookCallSlotBookingId: idCreate(), reason: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotDecline: booking not found');

        expectNoMutationSideEffects(serverRuntime);
        await expectErrorLogged(requestingSession.sessionId, /booking not found/);
    });

    it('rejects when the slot belongs to another cook', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
        });
        const otherCook = await commandSetup.withUser({ firstName: 'Other', lastName: 'Decline' });
        await testDb.insert(cooks).values({ cookId: otherCook.user.userId });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotDecline(
                cookMutationParent(otherCook.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: 'No' },
                otherCook.requestingSession,
                otherCook.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotDecline: booking not found');

        const [row] = await testDb
            .select({ status: cookCallSlotBookings.status })
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row?.status).toBe('PENDING');
        expectNoMutationSideEffects(otherCook.serverRuntime);
        await expectErrorLogged(otherCook.requestingSession.sessionId, /booking not found/);
    });

    it('rejects when the offer is already declined', async () => {
        // Arrange
        const fixture = await seedOffer({ cookAccepted: false });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
        });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotDecline(
                cookMutationParent(fixture.cookSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: offer already declined');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /offer already declined/);
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
            cookBookingRequestOfferCallSlotDecline(
                cookMutationParent(fixture.cookSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: booking request canceled');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /booking request canceled/);
    });

    it('rejects when the slot is not pending', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
            status: 'CONFIRMED',
        });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotDecline(
                cookMutationParent(fixture.cookSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotDecline: booking is not PENDING');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /not PENDING/);
    });

    it('rejects when the cook tries to decline a cook-initiated slot', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotDecline(
                cookMutationParent(fixture.cookSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotDecline: only customer-initiated slots can be declined by cook');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /only customer-initiated/);
    });

    it('declines a customer slot with a reason and emails the customer', async () => {
        // Arrange
        const fixture = await seedOffer({ userUnreadNotificationCount: 1 });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
        });

        // Act
        const result = await cookBookingRequestOfferCallSlotDecline(
            cookMutationParent(fixture.cookSetup.user.userId),
            { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: '  Fully booked  ' },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: slot.cookCallSlotBookingId });
        const [row] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row).toMatchObject({ status: 'DECLINED', declineReason: 'Fully booked' });

        const [offer] = await testDb
            .select({ userUnreadNotificationCount: bookingRequestOffers.userUnreadNotificationCount })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(offer?.userUnreadNotificationCount).toBe(2);

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.type).toBe('COOK_CALL_SLOT_DECLINED');
        expect(event?.payload).toMatchObject({
            cookCallSlotBookingId: slot.cookCallSlotBookingId,
            declineReason: 'Fully booked',
        });
        expect(fixture.cookSetup.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(fixture.cookSetup.serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: fixture.customerSetup.user.emailAddress,
                purpose: 'CALL_SLOT_BOOKING_DECLINE',
                userId: fixture.customerSetup.user.userId,
            }),
        );
        expectPartiesPublished(fixture.cookSetup.serverRuntime, fixture.cookSetup.user.userId, fixture.customerSetup.user.userId);
    });

    it('stores a blank decline reason as null and omits it from the event', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
        });

        // Act
        await cookBookingRequestOfferCallSlotDecline(
            cookMutationParent(fixture.cookSetup.user.userId),
            { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: '   ' },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
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
        expect(fixture.cookSetup.serverRuntime.email.send).toHaveBeenCalledOnce();
    });
});

describe('cookBookingRequestOfferCallSlotCancel', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ lastAcceptedPrivacyPolicy: null });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotCancel(
                cookMutationParent(user.userId),
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
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'CancelMiss' });
        await testDb.insert(cooks).values({ cookId: user.userId });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotCancel(
                cookMutationParent(user.userId),
                { cookCallSlotBookingId: idCreate(), reason: null },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotCancel: booking not found');

        expectNoMutationSideEffects(serverRuntime);
        await expectErrorLogged(requestingSession.sessionId, /booking not found/);
    });

    it('rejects when the slot belongs to another cook', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });
        const otherCook = await commandSetup.withUser({ firstName: 'Other', lastName: 'Cancel' });
        await testDb.insert(cooks).values({ cookId: otherCook.user.userId });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotCancel(
                cookMutationParent(otherCook.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                otherCook.requestingSession,
                otherCook.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotCancel: booking not found');

        const [row] = await testDb
            .select({ status: cookCallSlotBookings.status })
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row?.status).toBe('PENDING');
        expectNoMutationSideEffects(otherCook.serverRuntime);
        await expectErrorLogged(otherCook.requestingSession.sessionId, /booking not found/);
    });

    it('rejects when the offer is already declined', async () => {
        // Arrange
        const fixture = await seedOffer({ cookAccepted: false });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallSlotCancel(
                cookMutationParent(fixture.cookSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: offer already declined');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /offer already declined/);
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
            cookBookingRequestOfferCallSlotCancel(
                cookMutationParent(fixture.cookSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallWritableAssert: booking request canceled');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /booking request canceled/);
    });

    it('rejects when the slot is neither pending nor confirmed', async () => {
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
            cookBookingRequestOfferCallSlotCancel(
                cookMutationParent(fixture.cookSetup.user.userId),
                { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: null },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallSlotCancel: booking is not PENDING or CONFIRMED');

        expectNoMutationSideEffects(fixture.cookSetup.serverRuntime);
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /not PENDING or CONFIRMED/);
    });

    it('cancels a pending slot and records that it was not confirmed', async () => {
        // Arrange
        const fixture = await seedOffer({ userUnreadNotificationCount: 6 });
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'COOK',
        });

        // Act
        const result = await cookBookingRequestOfferCallSlotCancel(
            cookMutationParent(fixture.cookSetup.user.userId),
            { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: '  Schedule changed  ' },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: slot.cookCallSlotBookingId });
        const [row] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row).toMatchObject({ status: 'CANCELED', canceledBy: 'COOK', canceledReason: 'Schedule changed' });

        const [offer] = await testDb
            .select({ userUnreadNotificationCount: bookingRequestOffers.userUnreadNotificationCount })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(offer?.userUnreadNotificationCount).toBe(7);

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.type).toBe('COOK_CALL_SLOT_CANCELLED');
        expect(event?.payload).toMatchObject({
            cookCallSlotBookingId: slot.cookCallSlotBookingId,
            wasConfirmed: false,
            reason: 'Schedule changed',
        });
        expect(fixture.cookSetup.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(fixture.cookSetup.serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: fixture.customerSetup.user.emailAddress,
                purpose: 'CALL_SLOT_BOOKING_CANCEL',
                userId: fixture.customerSetup.user.userId,
            }),
        );
        expectPartiesPublished(fixture.cookSetup.serverRuntime, fixture.cookSetup.user.userId, fixture.customerSetup.user.userId);
    });

    it('cancels a confirmed slot and records wasConfirmed when the reason is blank', async () => {
        // Arrange
        const fixture = await seedOffer();
        const slot = await insertSlot({
            cookId: fixture.cookSetup.user.userId,
            userId: fixture.customerSetup.user.userId,
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            initiator: 'CUSTOMER',
            status: 'CONFIRMED',
        });

        // Act
        await cookBookingRequestOfferCallSlotCancel(
            cookMutationParent(fixture.cookSetup.user.userId),
            { cookCallSlotBookingId: slot.cookCallSlotBookingId, reason: '   ' },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        const [row] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, slot.cookCallSlotBookingId));
        expect(row).toMatchObject({ status: 'CANCELED', canceledBy: 'COOK', canceledReason: null });
        const [event] = await testDb
            .select({ payload: bookingRequestOfferEvents.payload })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.payload).toMatchObject({ wasConfirmed: true });
        expect(event?.payload).not.toHaveProperty('reason');
        expect(fixture.cookSetup.serverRuntime.email.send).toHaveBeenCalledOnce();
        expect(fixture.cookSetup.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    });
});
