import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferCallRooms, bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import type { GqlSAdminCallTrafficCriterion } from '../graphql/generated';
import { commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminCallTrafficCounts } from './adminCallTrafficCounts';
import { adminCallTrafficFindMany } from './adminCallTrafficFindMany';

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

async function seedTraffic() {
    const cookSetup = await commandSetup.withUser({ firstName: 'Traffico', lastName: 'Cook' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId });
    const customerSetup = await commandSetup.withUser({ firstName: 'Traffico', lastName: 'Guest' });
    const otherCustomer = await commandSetup.withUser({ firstName: 'Other', lastName: 'Guest' });
    const occasion = `Traffic-${idCreate()}`;
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customerSetup.user.userId,
        occasion,
        dateTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
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

    const anchor = new Date('2033-07-01T00:00:00.000Z');
    const at = (minutes: number) => new Date(anchor.getTime() + minutes * 60_000);
    const activeRoomId = idCreate();
    const endedRoomId = idCreate();
    await testDb.insert(bookingRequestOfferCallRooms).values([
        {
            bookingRequestOfferCallRoomId: activeRoomId,
            bookingRequestOfferId,
            livekitRoomName: `active-${activeRoomId}`,
            status: 'ACTIVE',
            createdByUserId: cookSetup.user.userId,
            startedAt: at(10),
        },
        {
            bookingRequestOfferCallRoomId: endedRoomId,
            bookingRequestOfferId,
            livekitRoomName: `ended-${endedRoomId}`,
            status: 'ENDED',
            createdByUserId: cookSetup.user.userId,
            startedAt: at(20),
            endedAt: at(25),
        },
    ]);

    const pendingCookId = idCreate();
    const pendingCustomerId = idCreate();
    const confirmedId = idCreate();
    const completedId = idCreate();
    const declinedId = idCreate();
    const canceledId = idCreate();
    const otherUserPendingId = idCreate();
    await testDb.insert(cookCallSlotBookings).values([
        {
            cookCallSlotBookingId: pendingCookId,
            cookId: cookSetup.user.userId,
            userId: customerSetup.user.userId,
            bookingRequestOfferId,
            initiator: 'COOK',
            status: 'PENDING',
            startAt: at(30),
            endAt: at(60),
            createdAt: at(200),
        },
        {
            cookCallSlotBookingId: pendingCustomerId,
            cookId: cookSetup.user.userId,
            userId: customerSetup.user.userId,
            bookingRequestOfferId,
            initiator: 'CUSTOMER',
            status: 'PENDING',
            startAt: at(40),
            endAt: at(70),
            createdAt: at(210),
        },
        {
            cookCallSlotBookingId: confirmedId,
            cookId: cookSetup.user.userId,
            userId: customerSetup.user.userId,
            bookingRequestOfferId,
            initiator: 'CUSTOMER',
            status: 'CONFIRMED',
            startAt: at(50),
            endAt: at(80),
            createdAt: at(220),
        },
        {
            cookCallSlotBookingId: completedId,
            cookId: cookSetup.user.userId,
            userId: customerSetup.user.userId,
            bookingRequestOfferId,
            initiator: 'CUSTOMER',
            status: 'COMPLETED',
            startAt: at(60),
            endAt: at(90),
            createdAt: at(230),
        },
        {
            cookCallSlotBookingId: declinedId,
            cookId: cookSetup.user.userId,
            userId: customerSetup.user.userId,
            bookingRequestOfferId,
            initiator: 'CUSTOMER',
            status: 'DECLINED',
            startAt: at(70),
            endAt: at(100),
            createdAt: at(240),
        },
        {
            cookCallSlotBookingId: canceledId,
            cookId: cookSetup.user.userId,
            userId: customerSetup.user.userId,
            bookingRequestOfferId,
            initiator: 'COOK',
            status: 'CANCELED',
            startAt: at(80),
            endAt: at(110),
            createdAt: at(250),
        },
        {
            cookCallSlotBookingId: otherUserPendingId,
            cookId: cookSetup.user.userId,
            userId: otherCustomer.user.userId,
            bookingRequestOfferId,
            initiator: 'CUSTOMER',
            status: 'PENDING',
            startAt: at(90),
            endAt: at(120),
            createdAt: at(260),
        },
    ]);

    const ids = {
        activeRoomId,
        endedRoomId,
        pendingCookId,
        pendingCustomerId,
        confirmedId,
        completedId,
        declinedId,
        canceledId,
        otherUserPendingId,
    };
    const occurredAtDesc = [
        otherUserPendingId,
        canceledId,
        declinedId,
        completedId,
        confirmedId,
        pendingCustomerId,
        pendingCookId,
        endedRoomId,
        activeRoomId,
    ];

    return {
        cookSetup,
        customerSetup,
        otherCustomer,
        occasion,
        anchor,
        at,
        ids,
        occurredAtDesc,
        cookId: cookSetup.user.userId,
    };
}

function idsOf(
    items: Array<{
        callRoom?: { bookingRequestOfferCallRoomId: string } | null;
        callSlotBooking?: { cookCallSlotBookingId: string } | null;
    }>,
) {
    return items.map((item) => item.callRoom?.bookingRequestOfferCallRoomId ?? item.callSlotBooking?.cookCallSlotBookingId);
}

describe('adminCallTrafficFindMany', () => {
    it('sorts by occurredAt descending by default and by createdAt when asked', async () => {
        // Arrange
        const fixture = await seedTraffic();
        const scoped = { cookIds: [fixture.cookId] };

        // Act
        const occurredDesc = await adminCallTrafficFindMany(
            { criterion: scoped },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );
        const occurredAsc = await adminCallTrafficFindMany(
            { criterion: { ...scoped, sortField: 'occurredAt', sortDirection: 'ASC' } },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );
        const createdAsc = await adminCallTrafficFindMany(
            { criterion: { ...scoped, sortField: 'createdAt', sortDirection: 'ASC' } },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(idsOf(occurredDesc)).toEqual(fixture.occurredAtDesc);
        expect(idsOf(occurredAsc)).toEqual([...fixture.occurredAtDesc].reverse());
        expect(idsOf(createdAsc).slice(0, 2)).toEqual([fixture.ids.activeRoomId, fixture.ids.endedRoomId]);
        expect(idsOf(createdAsc).at(-1)).toBe(fixture.ids.otherUserPendingId);
    });

    it('filters each kind', async () => {
        // Arrange
        const fixture = await seedTraffic();
        const runtime = fixture.cookSetup.serverRuntime;
        const session = fixture.cookSetup.requestingSession;
        const cases: Array<[GqlSAdminCallTrafficCriterion['kinds'], string[]]> = [
            [['LIVE'], [fixture.ids.activeRoomId]],
            [['RECENT_ROOM'], [fixture.ids.endedRoomId]],
            [['PENDING'], [fixture.ids.otherUserPendingId, fixture.ids.pendingCustomerId, fixture.ids.pendingCookId]],
            [['UPCOMING'], [fixture.ids.confirmedId]],
            [['RECENT_SLOT'], [fixture.ids.completedId]],
            [['DECLINED'], [fixture.ids.declinedId]],
            [['CANCELED'], [fixture.ids.canceledId]],
        ];

        // Act + Assert
        for (const [kinds, expected] of cases) {
            const rows = await adminCallTrafficFindMany({ criterion: { cookIds: [fixture.cookId], kinds } }, session, runtime);
            expect(idsOf(rows)).toEqual(expected);
        }
    });

    it('treats an empty kinds list as every kind for that cook', async () => {
        // Arrange
        const fixture = await seedTraffic();

        // Act
        const rows = await adminCallTrafficFindMany(
            { criterion: { cookIds: [fixture.cookId], kinds: [], searchText: '   ' } },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert — empty kinds means all kinds, and blank search adds no pattern.
        expect(idsOf(rows)).toEqual(fixture.occurredAtDesc);
    });

    it('filters by initiator, user, cook, range, and search text', async () => {
        // Arrange
        const fixture = await seedTraffic();
        const session = fixture.cookSetup.requestingSession;
        const runtime = fixture.cookSetup.serverRuntime;
        const confirmedAt = fixture.at(50);

        // Act
        const cookInitiated = await adminCallTrafficFindMany(
            { criterion: { cookIds: [fixture.cookId], initiators: ['COOK'] } },
            session,
            runtime,
        );
        const liveWithInitiator = await adminCallTrafficFindMany(
            { criterion: { cookIds: [fixture.cookId], kinds: ['LIVE'], initiators: ['COOK'] } },
            session,
            runtime,
        );
        const otherUser = await adminCallTrafficFindMany(
            { criterion: { cookIds: [fixture.cookId], userIds: [fixture.otherCustomer.user.userId] } },
            session,
            runtime,
        );
        const unknownUser = await adminCallTrafficFindMany(
            { criterion: { cookIds: [fixture.cookId], userIds: [idCreate()] } },
            session,
            runtime,
        );
        const unknownCook = await adminCallTrafficFindMany({ criterion: { cookIds: [idCreate()] } }, session, runtime);
        const inRange = await adminCallTrafficFindMany(
            { criterion: { cookIds: [fixture.cookId], range: { startDateTime: confirmedAt, endDateTime: confirmedAt } } },
            session,
            runtime,
        );
        const byOccasion = await adminCallTrafficFindMany(
            { criterion: { cookIds: [fixture.cookId], searchText: fixture.occasion } },
            session,
            runtime,
        );
        const byCookEmail = await adminCallTrafficFindMany(
            { criterion: { cookIds: [fixture.cookId], searchText: fixture.cookSetup.user.emailAddress ?? '' } },
            session,
            runtime,
        );
        const searchMiss = await adminCallTrafficFindMany(
            { criterion: { cookIds: [fixture.cookId], searchText: `missing-${idCreate()}` } },
            session,
            runtime,
        );

        // Assert
        expect(idsOf(cookInitiated)).toEqual([fixture.ids.canceledId, fixture.ids.pendingCookId]);
        expect(liveWithInitiator).toEqual([]);
        expect(idsOf(otherUser)).toEqual([fixture.ids.otherUserPendingId]);
        expect(unknownUser).toEqual([]);
        expect(unknownCook).toEqual([]);
        expect(idsOf(inRange)).toEqual([fixture.ids.confirmedId]);
        expect(idsOf(byOccasion)).toEqual(fixture.occurredAtDesc);
        expect(idsOf(byCookEmail)).toEqual(fixture.occurredAtDesc);
        expect(searchMiss).toEqual([]);
    });

    it('applies skip and take, including a negative skip and a zero take', async () => {
        // Arrange
        const fixture = await seedTraffic();
        const session = fixture.cookSetup.requestingSession;
        const runtime = fixture.cookSetup.serverRuntime;
        const pendingAsc: GqlSAdminCallTrafficCriterion = {
            cookIds: [fixture.cookId],
            kinds: ['PENDING'],
            sortField: 'occurredAt',
            sortDirection: 'ASC',
        };

        // Act
        const middle = await adminCallTrafficFindMany({ criterion: { ...pendingAsc, skip: 1, take: 1 } }, session, runtime);
        const clampedTake = await adminCallTrafficFindMany({ criterion: { ...pendingAsc, take: 0 } }, session, runtime);
        const negativeSkip = await adminCallTrafficFindMany({ criterion: { ...pendingAsc, skip: -3, take: 1 } }, session, runtime);

        // Assert
        expect(idsOf(middle)).toEqual([fixture.ids.pendingCustomerId]);
        expect(idsOf(clampedTake)).toEqual([fixture.ids.pendingCookId]);
        expect(idsOf(negativeSkip)).toEqual([fixture.ids.pendingCookId]);
    });
});

describe('adminCallTrafficCounts', () => {
    it('returns one count per criterion using the same filters as find many', async () => {
        // Arrange
        const fixture = await seedTraffic();
        const session = fixture.cookSetup.requestingSession;
        const runtime = fixture.cookSetup.serverRuntime;
        const live = { cookIds: [fixture.cookId], kinds: ['LIVE' as const] };
        const pending = { cookIds: [fixture.cookId], kinds: ['PENDING' as const] };
        const none = { cookIds: [fixture.cookId], kinds: ['LIVE' as const], initiators: ['COOK' as const] };

        // Act
        const counts = await adminCallTrafficCounts({ criteria: [live, pending, none] }, session, runtime);
        const liveRows = await adminCallTrafficFindMany({ criterion: live }, session, runtime);
        const pendingRows = await adminCallTrafficFindMany({ criterion: pending }, session, runtime);

        // Assert
        expect(counts).toEqual([liveRows.length, pendingRows.length, 0]);
        expect(counts).toEqual([1, 3, 0]);
    });

    it('counts every kind when kinds is empty and returns zero for an unknown cook', async () => {
        // Arrange
        const fixture = await seedTraffic();

        // Act
        const counts = await adminCallTrafficCounts(
            { criteria: [{ cookIds: [fixture.cookId], kinds: [] }, { cookIds: [idCreate()] }] },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(counts).toEqual([fixture.occurredAtDesc.length, 0]);
    });

    it('rejects an empty criteria list', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();

        // Act + Assert
        await expect(adminCallTrafficCounts({ criteria: [] }, requestingSession, serverRuntime)).rejects.toThrow(
            'adminCallTrafficCounts: criteria must not be empty',
        );
        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /criteria must not be empty/.test(row.message))).toBe(true);
    });

    it('rejects more than twenty criteria', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        const criteria = Array.from({ length: 21 }, () => ({ cookIds: [idCreate()] }));

        // Act + Assert
        await expect(adminCallTrafficCounts({ criteria }, requestingSession, serverRuntime)).rejects.toThrow(
            'adminCallTrafficCounts: too many criteria',
        );
        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /too many criteria/.test(row.message))).toBe(true);
    });
});
