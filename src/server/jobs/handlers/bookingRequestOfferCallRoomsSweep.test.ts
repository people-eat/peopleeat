import { and, eq, lt } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import {
    bookingRequestOfferCallRoomParticipants,
    bookingRequestOfferCallRooms,
    bookingRequestOffers,
    bookingRequests,
    cooks,
} from '../../db/schema';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { bookingRequestOfferCallRoomEndIfEmpty } from '../../utils/bookingRequestOfferCallRoomEndIfEmpty';
import { bookingRequestOfferCallRoomsSweep } from './bookingRequestOfferCallRoomsSweep';

vi.mock('../../utils/bookingRequestOfferCallRoomEndIfEmpty', () => ({
    bookingRequestOfferCallRoomEndIfEmpty: vi.fn(async () => true),
}));

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

async function seedActiveRoomFixture(startedAt: Date) {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Sweep' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId });

    const customerSetup = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Sweep' });
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
        paymentStatus: 'EMPTY',
    });

    const bookingRequestOfferCallRoomId = idCreate();
    const livekitRoomName = `test-room-${bookingRequestOfferCallRoomId}`;
    await testDb.insert(bookingRequestOfferCallRooms).values({
        bookingRequestOfferCallRoomId,
        bookingRequestOfferId,
        livekitRoomName,
        status: 'ACTIVE',
        createdByUserId: customerSetup.user.userId,
        startedAt,
    });

    const participantId = idCreate();
    await testDb.insert(bookingRequestOfferCallRoomParticipants).values({
        bookingRequestOfferCallRoomParticipantId: participantId,
        bookingRequestOfferCallRoomId,
        sessionId: customerSetup.requestingSession.sessionId,
        userId: customerSetup.user.userId,
        leftAt: null,
    });

    return {
        serverRuntime: customerSetup.serverRuntime,
        bookingRequestOfferCallRoomId,
        livekitRoomName,
        participantId,
    };
}

describe('bookingRequestOfferCallRoomsSweep', () => {
    beforeEach(() => {
        vi.mocked(bookingRequestOfferCallRoomEndIfEmpty).mockClear();
    });

    it('stamps leftAt on open participants and ends empty LiveKit rooms older than 90s', async () => {
        // Arrange
        const fixture = await seedActiveRoomFixture(new Date(Date.now() - 120_000));
        const listParticipants = vi.fn(async () => []);
        vi.mocked(fixture.serverRuntime.livekit.roomService).mockReturnValue({
            listParticipants,
        } as never);

        // Act
        await bookingRequestOfferCallRoomsSweep.handler({ data: undefined, serverRuntime: fixture.serverRuntime });

        // Assert
        expect(listParticipants).toHaveBeenCalledWith(fixture.livekitRoomName);
        const [participant] = await testDb
            .select()
            .from(bookingRequestOfferCallRoomParticipants)
            .where(eq(bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId, fixture.participantId));
        expect(participant?.leftAt).toBeInstanceOf(Date);
        expect(bookingRequestOfferCallRoomEndIfEmpty).toHaveBeenCalledWith(fixture.serverRuntime, fixture.bookingRequestOfferCallRoomId);

        await testDb
            .update(bookingRequestOfferCallRooms)
            .set({ status: 'ENDED', endedAt: new Date() })
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, fixture.bookingRequestOfferCallRoomId));
    });

    it('skips ending when LiveKit still has participants', async () => {
        // Arrange
        const fixture = await seedActiveRoomFixture(new Date(Date.now() - 120_000));
        const listParticipants = vi.fn(async () => [{ identity: 'still-here' }]);
        vi.mocked(fixture.serverRuntime.livekit.roomService).mockReturnValue({
            listParticipants,
        } as never);

        // Act
        await bookingRequestOfferCallRoomsSweep.handler({ data: undefined, serverRuntime: fixture.serverRuntime });

        // Assert
        expect(listParticipants).toHaveBeenCalledWith(fixture.livekitRoomName);
        const [participant] = await testDb
            .select()
            .from(bookingRequestOfferCallRoomParticipants)
            .where(eq(bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId, fixture.participantId));
        expect(participant?.leftAt).toBeNull();
        expect(bookingRequestOfferCallRoomEndIfEmpty).not.toHaveBeenCalledWith(
            fixture.serverRuntime,
            fixture.bookingRequestOfferCallRoomId,
        );

        await testDb
            .update(bookingRequestOfferCallRooms)
            .set({ status: 'ENDED', endedAt: new Date() })
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, fixture.bookingRequestOfferCallRoomId));
    });

    it('does not call LiveKit when there are no ACTIVE rooms older than 90s', async () => {
        // Arrange — end leftover old ACTIVE rooms from prior shared-DB runs
        const cutoff = new Date(Date.now() - 90_000);
        await testDb
            .update(bookingRequestOfferCallRooms)
            .set({ status: 'ENDED', endedAt: new Date() })
            .where(and(eq(bookingRequestOfferCallRooms.status, 'ACTIVE'), lt(bookingRequestOfferCallRooms.startedAt, cutoff)));
        const fixture = await seedActiveRoomFixture(new Date(Date.now() - 30_000));
        const listParticipants = vi.fn(async () => []);
        vi.mocked(fixture.serverRuntime.livekit.roomService).mockReturnValue({
            listParticipants,
        } as never);

        // Act
        await bookingRequestOfferCallRoomsSweep.handler({ data: undefined, serverRuntime: fixture.serverRuntime });

        // Assert
        expect(fixture.serverRuntime.livekit.roomService).not.toHaveBeenCalled();
        expect(listParticipants).not.toHaveBeenCalled();
        expect(bookingRequestOfferCallRoomEndIfEmpty).not.toHaveBeenCalledWith(
            fixture.serverRuntime,
            fixture.bookingRequestOfferCallRoomId,
        );
        const [participant] = await testDb
            .select()
            .from(bookingRequestOfferCallRoomParticipants)
            .where(eq(bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId, fixture.participantId));
        expect(participant?.leftAt).toBeNull();
    });
});
