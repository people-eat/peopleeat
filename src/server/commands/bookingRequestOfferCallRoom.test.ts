import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    admins,
    bookingRequestOfferCallRoomParticipants,
    bookingRequestOfferCallRooms,
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequests,
    cooks,
} from '../db/schema';
import {
    adminMutationParent,
    commandSetup,
    cookMutationParent,
    findLogsForSession,
    testDb,
    userMutationParent,
} from '../test/commandTestUtils';
import { adminBookingRequestOfferCallCreate } from './adminBookingRequestOfferCallCreate';
import { adminBookingRequestOfferCallJoin } from './adminBookingRequestOfferCallJoin';
import { adminBookingRequestOfferCallLeave } from './adminBookingRequestOfferCallLeave';
import { cookBookingRequestOfferCallCreate } from './cookBookingRequestOfferCallCreate';
import { cookBookingRequestOfferCallJoin } from './cookBookingRequestOfferCallJoin';
import { cookBookingRequestOfferCallLeave } from './cookBookingRequestOfferCallLeave';
import { userBookingRequestOfferCallCreate } from './userBookingRequestOfferCallCreate';
import { userBookingRequestOfferCallJoin } from './userBookingRequestOfferCallJoin';
import { userBookingRequestOfferCallLeave } from './userBookingRequestOfferCallLeave';

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

type Runtime = Awaited<ReturnType<typeof commandSetup>>['serverRuntime'];

async function seedOffer(
    options: {
        userUnreadNotificationCount?: number;
        cookUnreadNotificationCount?: number;
        cookFirstName?: string;
        customerFirstName?: string;
    } = {},
) {
    const cookSetup = await commandSetup.withUser({ firstName: options.cookFirstName ?? 'Chef', lastName: 'Room' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId, callSchedulingEnabled: true, callDurationMinutes: 30 });
    const customerSetup = await commandSetup.withUser({ firstName: options.customerFirstName ?? 'Customer', lastName: 'Room' });
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
    });
    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cookSetup.user.userId,
        cookAccepted: true,
        userAccepted: null,
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

async function seedAdmin() {
    const adminSetup = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Room' });
    await testDb.insert(admins).values({ adminId: adminSetup.user.userId });
    return adminSetup;
}

function stubLivekit(serverRuntime: Runtime) {
    const createRoom = vi.fn(async () => ({}));
    const deleteRoom = vi.fn(async () => {});
    vi.mocked(serverRuntime.livekit.roomService).mockReturnValue({
        createRoom,
        deleteRoom,
        listParticipants: vi.fn(async () => []),
    } as never);
    vi.mocked(serverRuntime.livekit.accessTokenCreate).mockResolvedValue('test-token');
    vi.mocked(serverRuntime.livekit.url).mockReturnValue('wss://livekit.test');
    return { createRoom, deleteRoom };
}

async function insertRoom(args: { bookingRequestOfferId: string; createdByUserId: string; status?: 'ACTIVE' | 'ENDED' }) {
    const bookingRequestOfferCallRoomId = idCreate();
    const livekitRoomName = `test-room-${bookingRequestOfferCallRoomId}`;
    await testDb.insert(bookingRequestOfferCallRooms).values({
        bookingRequestOfferCallRoomId,
        bookingRequestOfferId: args.bookingRequestOfferId,
        livekitRoomName,
        status: args.status ?? 'ACTIVE',
        createdByUserId: args.createdByUserId,
    });
    return { bookingRequestOfferCallRoomId, livekitRoomName };
}

async function insertParticipant(args: { bookingRequestOfferCallRoomId: string; sessionId: string; userId: string; leftAt?: Date | null }) {
    const bookingRequestOfferCallRoomParticipantId = idCreate();
    await testDb.insert(bookingRequestOfferCallRoomParticipants).values({
        bookingRequestOfferCallRoomParticipantId,
        bookingRequestOfferCallRoomId: args.bookingRequestOfferCallRoomId,
        sessionId: args.sessionId,
        userId: args.userId,
        leftAt: args.leftAt ?? null,
    });
    return bookingRequestOfferCallRoomParticipantId;
}

function expectNoCallSideEffects(serverRuntime: Runtime) {
    expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.livekit.roomService).not.toHaveBeenCalled();
    expect(serverRuntime.livekit.accessTokenCreate).not.toHaveBeenCalled();
    expect(serverRuntime.email.send).not.toHaveBeenCalled();
    expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
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
    expect(serverRuntime.email.send).not.toHaveBeenCalled();
    expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
}

describe('cookBookingRequestOfferCallCreate', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withStaleLegalAcceptance();

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallCreate(
                cookMutationParent(user.userId),
                { bookingRequestOfferId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        expectNoCallSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects when the offer id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'MissingRoom' });
        await testDb.insert(cooks).values({ cookId: user.userId });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallCreate(
                cookMutationParent(user.userId),
                { bookingRequestOfferId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallCreate: offer not found');

        expectNoCallSideEffects(serverRuntime);
        await expectErrorLogged(requestingSession.sessionId, /offer not found/);
    });

    it('rejects when the offer belongs to another cook', async () => {
        // Arrange
        const fixture = await seedOffer();
        const otherCook = await commandSetup.withUser({ firstName: 'Other', lastName: 'Create' });
        await testDb.insert(cooks).values({ cookId: otherCook.user.userId });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallCreate(
                cookMutationParent(otherCook.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId },
                otherCook.requestingSession,
                otherCook.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallCreate: offer not found');

        const rooms = await testDb
            .select()
            .from(bookingRequestOfferCallRooms)
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(rooms).toHaveLength(0);
        expectNoCallSideEffects(otherCook.serverRuntime);
        await expectErrorLogged(otherCook.requestingSession.sessionId, /offer not found/);
    });

    it('creates an active room and returns a LiveKit token', async () => {
        // Arrange
        const fixture = await seedOffer({ userUnreadNotificationCount: 3, cookFirstName: 'Ada' });
        const livekit = stubLivekit(fixture.cookSetup.serverRuntime);

        // Act
        const result = await cookBookingRequestOfferCallCreate(
            cookMutationParent(fixture.cookSetup.user.userId),
            { bookingRequestOfferId: fixture.bookingRequestOfferId },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(result.token).toBe('test-token');
        expect(result.url).toBe('wss://livekit.test');
        const [room] = await testDb
            .select()
            .from(bookingRequestOfferCallRooms)
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(room).toMatchObject({
            status: 'ACTIVE',
            createdByUserId: fixture.cookSetup.user.userId,
        });
        expect(room?.livekitRoomName).toContain(`test-offer-${fixture.bookingRequestOfferId}-`);
        const [participant] = await testDb
            .select()
            .from(bookingRequestOfferCallRoomParticipants)
            .where(
                eq(
                    bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId,
                    result.bookingRequestOfferCallRoomParticipantId,
                ),
            );
        expect(participant).toMatchObject({
            userId: fixture.cookSetup.user.userId,
            sessionId: fixture.cookSetup.requestingSession.sessionId,
            leftAt: null,
        });
        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.type).toBe('COOK_CALL_STARTED');
        const [offer] = await testDb
            .select({
                userUnreadNotificationCount: bookingRequestOffers.userUnreadNotificationCount,
                cookUnreadNotificationCount: bookingRequestOffers.cookUnreadNotificationCount,
            })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(offer).toEqual({ userUnreadNotificationCount: 4, cookUnreadNotificationCount: 0 });
        expect(livekit.createRoom).toHaveBeenCalledWith(
            expect.objectContaining({
                name: room?.livekitRoomName,
                emptyTimeout: 60,
                departureTimeout: 30,
            }),
        );
        expect(fixture.cookSetup.serverRuntime.livekit.accessTokenCreate).toHaveBeenCalledWith({
            identity: fixture.cookSetup.user.userId,
            name: 'Ada',
            roomName: room?.livekitRoomName,
        });
        expectPartiesPublished(fixture.cookSetup.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });
});

describe('cookBookingRequestOfferCallJoin', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withStaleLegalAcceptance();

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallJoin(
                cookMutationParent(user.userId),
                { bookingRequestOfferId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        expectNoCallSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects when the offer id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'JoinMiss' });
        await testDb.insert(cooks).values({ cookId: user.userId });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallJoin(
                cookMutationParent(user.userId),
                { bookingRequestOfferId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallJoin: offer not found');

        expectNoCallSideEffects(serverRuntime);
        await expectErrorLogged(requestingSession.sessionId, /offer not found/);
    });

    it('rejects when the offer belongs to another cook', async () => {
        // Arrange
        const fixture = await seedOffer();
        const otherCook = await commandSetup.withUser({ firstName: 'Other', lastName: 'Join' });
        await testDb.insert(cooks).values({ cookId: otherCook.user.userId });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallJoin(
                cookMutationParent(otherCook.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId },
                otherCook.requestingSession,
                otherCook.serverRuntime,
            ),
        ).rejects.toThrow('cookBookingRequestOfferCallJoin: offer not found');

        expectNoCallSideEffects(otherCook.serverRuntime);
        await expectErrorLogged(otherCook.requestingSession.sessionId, /offer not found/);
    });

    it('rejects when the offer has no active room', async () => {
        // Arrange
        const fixture = await seedOffer();
        stubLivekit(fixture.cookSetup.serverRuntime);

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallJoin(
                cookMutationParent(fixture.cookSetup.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallTokenIssue: no active call room');

        expect(fixture.cookSetup.serverRuntime.livekit.accessTokenCreate).not.toHaveBeenCalled();
        expect(fixture.cookSetup.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /no active call room/);
    });

    it('joins an active room and returns a LiveKit token', async () => {
        // Arrange
        const fixture = await seedOffer({ userUnreadNotificationCount: 2, cookUnreadNotificationCount: 1, cookFirstName: 'Bea' });
        const room = await insertRoom({
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            createdByUserId: fixture.customerSetup.user.userId,
        });
        const livekit = stubLivekit(fixture.cookSetup.serverRuntime);

        // Act
        const result = await cookBookingRequestOfferCallJoin(
            cookMutationParent(fixture.cookSetup.user.userId),
            { bookingRequestOfferId: fixture.bookingRequestOfferId },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(result).toMatchObject({ token: 'test-token', url: 'wss://livekit.test' });
        const [participant] = await testDb
            .select()
            .from(bookingRequestOfferCallRoomParticipants)
            .where(
                eq(
                    bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId,
                    result.bookingRequestOfferCallRoomParticipantId,
                ),
            );
        expect(participant).toMatchObject({
            bookingRequestOfferCallRoomId: room.bookingRequestOfferCallRoomId,
            userId: fixture.cookSetup.user.userId,
            leftAt: null,
        });
        const events = await testDb
            .select({ type: bookingRequestOfferEvents.type })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(events).toHaveLength(0);
        const [offer] = await testDb
            .select({
                userUnreadNotificationCount: bookingRequestOffers.userUnreadNotificationCount,
                cookUnreadNotificationCount: bookingRequestOffers.cookUnreadNotificationCount,
            })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(offer).toEqual({ userUnreadNotificationCount: 2, cookUnreadNotificationCount: 1 });
        expect(livekit.createRoom).not.toHaveBeenCalled();
        expect(fixture.cookSetup.serverRuntime.livekit.accessTokenCreate).toHaveBeenCalledWith({
            identity: fixture.cookSetup.user.userId,
            name: 'Bea',
            roomName: room.livekitRoomName,
        });
        expectPartiesPublished(fixture.cookSetup.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });
});

describe('cookBookingRequestOfferCallLeave', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withStaleLegalAcceptance();

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallLeave(
                cookMutationParent(user.userId),
                { bookingRequestOfferCallRoomParticipantId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        expectNoCallSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('returns success when the participant id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'LeaveMiss' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const missingId = idCreate();

        // Act
        const result = await cookBookingRequestOfferCallLeave(
            cookMutationParent(user.userId),
            { bookingRequestOfferCallRoomParticipantId: missingId },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: missingId });
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('returns success without changes when the participant already left', async () => {
        // Arrange
        const fixture = await seedOffer();
        const room = await insertRoom({
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            createdByUserId: fixture.cookSetup.user.userId,
        });
        const leftAt = new Date('2030-01-01T00:00:00.000Z');
        const participantId = await insertParticipant({
            bookingRequestOfferCallRoomId: room.bookingRequestOfferCallRoomId,
            sessionId: fixture.customerSetup.requestingSession.sessionId,
            userId: fixture.customerSetup.user.userId,
            leftAt,
        });

        // Act
        const result = await cookBookingRequestOfferCallLeave(
            cookMutationParent(fixture.cookSetup.user.userId),
            { bookingRequestOfferCallRoomParticipantId: participantId },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: participantId });
        const [participant] = await testDb
            .select({ leftAt: bookingRequestOfferCallRoomParticipants.leftAt })
            .from(bookingRequestOfferCallRoomParticipants)
            .where(eq(bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId, participantId));
        expect(participant?.leftAt?.toISOString()).toBe(leftAt.toISOString());
        const [storedRoom] = await testDb
            .select({ status: bookingRequestOfferCallRooms.status })
            .from(bookingRequestOfferCallRooms)
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, room.bookingRequestOfferCallRoomId));
        expect(storedRoom?.status).toBe('ACTIVE');
        expect(fixture.cookSetup.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects when the participant belongs to someone else', async () => {
        // Arrange
        const fixture = await seedOffer();
        const room = await insertRoom({
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            createdByUserId: fixture.customerSetup.user.userId,
        });
        const participantId = await insertParticipant({
            bookingRequestOfferCallRoomId: room.bookingRequestOfferCallRoomId,
            sessionId: fixture.customerSetup.requestingSession.sessionId,
            userId: fixture.customerSetup.user.userId,
        });

        // Act + Assert
        await expect(
            cookBookingRequestOfferCallLeave(
                cookMutationParent(fixture.cookSetup.user.userId),
                { bookingRequestOfferCallRoomParticipantId: participantId },
                fixture.cookSetup.requestingSession,
                fixture.cookSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallRoomParticipantLeft: participant not owned by actor');

        const [participant] = await testDb
            .select({ leftAt: bookingRequestOfferCallRoomParticipants.leftAt })
            .from(bookingRequestOfferCallRoomParticipants)
            .where(eq(bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId, participantId));
        expect(participant?.leftAt).toBeNull();
        expect(fixture.cookSetup.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        await expectErrorLogged(fixture.cookSetup.requestingSession.sessionId, /participant not owned by actor/);
    });

    it('marks the cook left and keeps the room active while someone else remains', async () => {
        // Arrange
        const fixture = await seedOffer();
        const room = await insertRoom({
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            createdByUserId: fixture.cookSetup.user.userId,
        });
        const cookParticipantId = await insertParticipant({
            bookingRequestOfferCallRoomId: room.bookingRequestOfferCallRoomId,
            sessionId: fixture.cookSetup.requestingSession.sessionId,
            userId: fixture.cookSetup.user.userId,
        });
        const customerParticipantId = await insertParticipant({
            bookingRequestOfferCallRoomId: room.bookingRequestOfferCallRoomId,
            sessionId: fixture.customerSetup.requestingSession.sessionId,
            userId: fixture.customerSetup.user.userId,
        });
        const livekit = stubLivekit(fixture.cookSetup.serverRuntime);

        // Act
        const result = await cookBookingRequestOfferCallLeave(
            cookMutationParent(fixture.cookSetup.user.userId),
            { bookingRequestOfferCallRoomParticipantId: cookParticipantId },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: cookParticipantId });
        const participants = await testDb
            .select()
            .from(bookingRequestOfferCallRoomParticipants)
            .where(eq(bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomId, room.bookingRequestOfferCallRoomId));
        expect(participants.find((row) => row.bookingRequestOfferCallRoomParticipantId === cookParticipantId)?.leftAt).toBeInstanceOf(Date);
        expect(participants.find((row) => row.bookingRequestOfferCallRoomParticipantId === customerParticipantId)?.leftAt).toBeNull();
        const [storedRoom] = await testDb
            .select({ status: bookingRequestOfferCallRooms.status })
            .from(bookingRequestOfferCallRooms)
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, room.bookingRequestOfferCallRoomId));
        expect(storedRoom?.status).toBe('ACTIVE');
        expect(livekit.deleteRoom).not.toHaveBeenCalled();
        expect(fixture.cookSetup.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('ends the room when the cook is the last participant to leave', async () => {
        // Arrange
        const fixture = await seedOffer();
        const room = await insertRoom({
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            createdByUserId: fixture.cookSetup.user.userId,
        });
        const participantId = await insertParticipant({
            bookingRequestOfferCallRoomId: room.bookingRequestOfferCallRoomId,
            sessionId: fixture.cookSetup.requestingSession.sessionId,
            userId: fixture.cookSetup.user.userId,
        });
        const livekit = stubLivekit(fixture.cookSetup.serverRuntime);

        // Act
        const result = await cookBookingRequestOfferCallLeave(
            cookMutationParent(fixture.cookSetup.user.userId),
            { bookingRequestOfferCallRoomParticipantId: participantId },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: participantId });
        const [storedRoom] = await testDb
            .select()
            .from(bookingRequestOfferCallRooms)
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, room.bookingRequestOfferCallRoomId));
        expect(storedRoom?.status).toBe('ENDED');
        expect(storedRoom?.endedAt).toBeInstanceOf(Date);
        expect(livekit.deleteRoom).toHaveBeenCalledWith(room.livekitRoomName);
        expectPartiesPublished(fixture.cookSetup.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });
});

describe('userBookingRequestOfferCallCreate', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withStaleLegalAcceptance();

        // Act + Assert
        await expect(
            userBookingRequestOfferCallCreate(
                userMutationParent(user.userId),
                { bookingRequestOfferId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        expectNoCallSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects when the customer is not active', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            status: 'BANNED',
            firstName: 'Banned',
            lastName: 'Guest',
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallCreate(
                userMutationParent(user.userId),
                { bookingRequestOfferId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallCreate: user is not active');

        expectNoCallSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects when the offer id is unknown', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Customer', lastName: 'MissingRoom' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallCreate(
                userMutationParent(user.userId),
                { bookingRequestOfferId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallCreate: offer not found');

        expectNoCallSideEffects(serverRuntime);
        await expectErrorLogged(requestingSession.sessionId, /offer not found/);
    });

    it('rejects when the offer belongs to another customer', async () => {
        // Arrange
        const fixture = await seedOffer();
        const stranger = await commandSetup.withUser({ firstName: 'Stranger', lastName: 'Create' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallCreate(
                userMutationParent(stranger.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId },
                stranger.requestingSession,
                stranger.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallCreate: offer not found');

        expectNoCallSideEffects(stranger.serverRuntime);
        await expectErrorLogged(stranger.requestingSession.sessionId, /offer not found/);
    });

    it('creates an active room and returns a LiveKit token', async () => {
        // Arrange
        const fixture = await seedOffer({ cookUnreadNotificationCount: 2, customerFirstName: 'Cleo' });
        const livekit = stubLivekit(fixture.customerSetup.serverRuntime);

        // Act
        const result = await userBookingRequestOfferCallCreate(
            userMutationParent(fixture.customerSetup.user.userId),
            { bookingRequestOfferId: fixture.bookingRequestOfferId },
            fixture.customerSetup.requestingSession,
            fixture.customerSetup.serverRuntime,
        );

        // Assert
        expect(result).toMatchObject({ token: 'test-token', url: 'wss://livekit.test' });
        const [event] = await testDb
            .select({ type: bookingRequestOfferEvents.type })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.type).toBe('USER_CALL_STARTED');
        const [offer] = await testDb
            .select({
                userUnreadNotificationCount: bookingRequestOffers.userUnreadNotificationCount,
                cookUnreadNotificationCount: bookingRequestOffers.cookUnreadNotificationCount,
            })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(offer).toEqual({ userUnreadNotificationCount: 0, cookUnreadNotificationCount: 3 });
        expect(livekit.createRoom).toHaveBeenCalledOnce();
        expect(fixture.customerSetup.serverRuntime.livekit.accessTokenCreate).toHaveBeenCalledWith(
            expect.objectContaining({ identity: fixture.customerSetup.user.userId, name: 'Cleo' }),
        );
        expectPartiesPublished(fixture.customerSetup.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });
});

describe('userBookingRequestOfferCallJoin', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withStaleLegalAcceptance();

        // Act + Assert
        await expect(
            userBookingRequestOfferCallJoin(
                userMutationParent(user.userId),
                { bookingRequestOfferId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        expectNoCallSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects when the offer belongs to another customer', async () => {
        // Arrange
        const fixture = await seedOffer();
        const stranger = await commandSetup.withUser({ firstName: 'Stranger', lastName: 'Join' });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallJoin(
                userMutationParent(stranger.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId },
                stranger.requestingSession,
                stranger.serverRuntime,
            ),
        ).rejects.toThrow('userBookingRequestOfferCallJoin: offer not found');

        expectNoCallSideEffects(stranger.serverRuntime);
        await expectErrorLogged(stranger.requestingSession.sessionId, /offer not found/);
    });

    it('rejects when the offer has no active room', async () => {
        // Arrange
        const fixture = await seedOffer();
        stubLivekit(fixture.customerSetup.serverRuntime);

        // Act + Assert
        await expect(
            userBookingRequestOfferCallJoin(
                userMutationParent(fixture.customerSetup.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallTokenIssue: no active call room');

        expect(fixture.customerSetup.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /no active call room/);
    });

    it('joins an active room and returns a LiveKit token', async () => {
        // Arrange
        const fixture = await seedOffer({ customerFirstName: 'Dina' });
        const room = await insertRoom({
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            createdByUserId: fixture.cookSetup.user.userId,
        });
        stubLivekit(fixture.customerSetup.serverRuntime);

        // Act
        const result = await userBookingRequestOfferCallJoin(
            userMutationParent(fixture.customerSetup.user.userId),
            { bookingRequestOfferId: fixture.bookingRequestOfferId },
            fixture.customerSetup.requestingSession,
            fixture.customerSetup.serverRuntime,
        );

        // Assert
        expect(result).toMatchObject({ token: 'test-token', url: 'wss://livekit.test' });
        const [participant] = await testDb
            .select()
            .from(bookingRequestOfferCallRoomParticipants)
            .where(
                eq(
                    bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId,
                    result.bookingRequestOfferCallRoomParticipantId,
                ),
            );
        expect(participant?.bookingRequestOfferCallRoomId).toBe(room.bookingRequestOfferCallRoomId);
        expect(fixture.customerSetup.serverRuntime.livekit.roomService).not.toHaveBeenCalled();
        expectPartiesPublished(fixture.customerSetup.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });
});

describe('userBookingRequestOfferCallLeave', () => {
    it('rejects when privacy policy acceptance is stale', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withStaleLegalAcceptance();

        // Act + Assert
        await expect(
            userBookingRequestOfferCallLeave(
                userMutationParent(user.userId),
                { bookingRequestOfferCallRoomParticipantId: idCreate() },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        expectNoCallSideEffects(serverRuntime);
        await expectNoErrorLog(requestingSession.sessionId);
    });

    it('rejects when the participant belongs to someone else', async () => {
        // Arrange
        const fixture = await seedOffer();
        const room = await insertRoom({
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            createdByUserId: fixture.cookSetup.user.userId,
        });
        const participantId = await insertParticipant({
            bookingRequestOfferCallRoomId: room.bookingRequestOfferCallRoomId,
            sessionId: fixture.cookSetup.requestingSession.sessionId,
            userId: fixture.cookSetup.user.userId,
        });

        // Act + Assert
        await expect(
            userBookingRequestOfferCallLeave(
                userMutationParent(fixture.customerSetup.user.userId),
                { bookingRequestOfferCallRoomParticipantId: participantId },
                fixture.customerSetup.requestingSession,
                fixture.customerSetup.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallRoomParticipantLeft: participant not owned by actor');

        expect(fixture.customerSetup.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        await expectErrorLogged(fixture.customerSetup.requestingSession.sessionId, /participant not owned by actor/);
    });

    it('ends the room when the customer is the last participant to leave', async () => {
        // Arrange
        const fixture = await seedOffer();
        const room = await insertRoom({
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            createdByUserId: fixture.customerSetup.user.userId,
        });
        const participantId = await insertParticipant({
            bookingRequestOfferCallRoomId: room.bookingRequestOfferCallRoomId,
            sessionId: fixture.customerSetup.requestingSession.sessionId,
            userId: fixture.customerSetup.user.userId,
        });
        const livekit = stubLivekit(fixture.customerSetup.serverRuntime);

        // Act
        const result = await userBookingRequestOfferCallLeave(
            userMutationParent(fixture.customerSetup.user.userId),
            { bookingRequestOfferCallRoomParticipantId: participantId },
            fixture.customerSetup.requestingSession,
            fixture.customerSetup.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: participantId });
        const [storedRoom] = await testDb
            .select({ status: bookingRequestOfferCallRooms.status })
            .from(bookingRequestOfferCallRooms)
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, room.bookingRequestOfferCallRoomId));
        expect(storedRoom?.status).toBe('ENDED');
        expect(livekit.deleteRoom).toHaveBeenCalledWith(room.livekitRoomName);
        expectPartiesPublished(fixture.customerSetup.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });
});

describe('adminBookingRequestOfferCallCreate', () => {
    it('rejects when the offer id is unknown', async () => {
        // Arrange
        const admin = await seedAdmin();

        // Act + Assert
        await expect(
            adminBookingRequestOfferCallCreate(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferId: idCreate() },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow('adminBookingRequestOfferCallCreate: offer not found');

        expectNoCallSideEffects(admin.serverRuntime);
        await expectErrorLogged(admin.requestingSession.sessionId, /offer not found/);
    });

    it('creates an active room and returns a LiveKit token', async () => {
        // Arrange
        const fixture = await seedOffer({ userUnreadNotificationCount: 1, cookUnreadNotificationCount: 1 });
        const admin = await seedAdmin();
        const livekit = stubLivekit(admin.serverRuntime);

        // Act
        const result = await adminBookingRequestOfferCallCreate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId: fixture.bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toMatchObject({ token: 'test-token', url: 'wss://livekit.test' });
        const [room] = await testDb
            .select()
            .from(bookingRequestOfferCallRooms)
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(room).toMatchObject({ status: 'ACTIVE', createdByUserId: admin.user.userId });
        const [event] = await testDb
            .select({ type: bookingRequestOfferEvents.type })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(event?.type).toBe('ADMIN_CALL_STARTED');
        const [offer] = await testDb
            .select({
                userUnreadNotificationCount: bookingRequestOffers.userUnreadNotificationCount,
                cookUnreadNotificationCount: bookingRequestOffers.cookUnreadNotificationCount,
            })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, fixture.bookingRequestOfferId));
        expect(offer).toEqual({ userUnreadNotificationCount: 2, cookUnreadNotificationCount: 2 });
        expect(livekit.createRoom).toHaveBeenCalledOnce();
        expect(admin.serverRuntime.livekit.accessTokenCreate).toHaveBeenCalledWith(
            expect.objectContaining({ identity: admin.user.userId, name: 'Admin' }),
        );
        expectPartiesPublished(admin.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });
});

describe('adminBookingRequestOfferCallJoin', () => {
    it('rejects when the offer id is unknown', async () => {
        // Arrange
        const admin = await seedAdmin();

        // Act + Assert
        await expect(
            adminBookingRequestOfferCallJoin(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferId: idCreate() },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow('adminBookingRequestOfferCallJoin: offer not found');

        expectNoCallSideEffects(admin.serverRuntime);
        await expectErrorLogged(admin.requestingSession.sessionId, /offer not found/);
    });

    it('rejects when the offer has no active room', async () => {
        // Arrange
        const fixture = await seedOffer();
        const admin = await seedAdmin();
        stubLivekit(admin.serverRuntime);

        // Act + Assert
        await expect(
            adminBookingRequestOfferCallJoin(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferId: fixture.bookingRequestOfferId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallTokenIssue: no active call room');

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        await expectErrorLogged(admin.requestingSession.sessionId, /no active call room/);
    });

    it('joins an active room and returns a LiveKit token', async () => {
        // Arrange
        const fixture = await seedOffer();
        const admin = await seedAdmin();
        const room = await insertRoom({
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            createdByUserId: fixture.cookSetup.user.userId,
        });
        stubLivekit(admin.serverRuntime);

        // Act
        const result = await adminBookingRequestOfferCallJoin(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId: fixture.bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toMatchObject({ token: 'test-token', url: 'wss://livekit.test' });
        const [participant] = await testDb
            .select()
            .from(bookingRequestOfferCallRoomParticipants)
            .where(
                eq(
                    bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId,
                    result.bookingRequestOfferCallRoomParticipantId,
                ),
            );
        expect(participant).toMatchObject({
            bookingRequestOfferCallRoomId: room.bookingRequestOfferCallRoomId,
            userId: admin.user.userId,
        });
        expect(admin.serverRuntime.livekit.roomService).not.toHaveBeenCalled();
        expectPartiesPublished(admin.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });
});

describe('adminBookingRequestOfferCallLeave', () => {
    it('rejects when the participant belongs to someone else', async () => {
        // Arrange
        const fixture = await seedOffer();
        const admin = await seedAdmin();
        const room = await insertRoom({
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            createdByUserId: fixture.cookSetup.user.userId,
        });
        const participantId = await insertParticipant({
            bookingRequestOfferCallRoomId: room.bookingRequestOfferCallRoomId,
            sessionId: fixture.cookSetup.requestingSession.sessionId,
            userId: fixture.cookSetup.user.userId,
        });

        // Act + Assert
        await expect(
            adminBookingRequestOfferCallLeave(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferCallRoomParticipantId: participantId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow('bookingRequestOfferCallRoomParticipantLeft: participant not owned by actor');

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        await expectErrorLogged(admin.requestingSession.sessionId, /participant not owned by actor/);
    });

    it('ends the room when the admin is the last participant to leave', async () => {
        // Arrange
        const fixture = await seedOffer();
        const admin = await seedAdmin();
        const room = await insertRoom({
            bookingRequestOfferId: fixture.bookingRequestOfferId,
            createdByUserId: admin.user.userId,
        });
        const participantId = await insertParticipant({
            bookingRequestOfferCallRoomId: room.bookingRequestOfferCallRoomId,
            sessionId: admin.requestingSession.sessionId,
            userId: admin.user.userId,
        });
        const livekit = stubLivekit(admin.serverRuntime);

        // Act
        const result = await adminBookingRequestOfferCallLeave(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferCallRoomParticipantId: participantId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: participantId });
        const [storedRoom] = await testDb
            .select({ status: bookingRequestOfferCallRooms.status })
            .from(bookingRequestOfferCallRooms)
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, room.bookingRequestOfferCallRoomId));
        expect(storedRoom?.status).toBe('ENDED');
        expect(livekit.deleteRoom).toHaveBeenCalledWith(room.livekitRoomName);
        expectPartiesPublished(admin.serverRuntime, fixture.customerSetup.user.userId, fixture.cookSetup.user.userId);
    });
});
