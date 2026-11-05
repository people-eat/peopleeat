import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferCallRooms, bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCallCookStatsFindMany } from './adminCallCookStatsFindMany';

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

function isolatedRange() {
    const millisecondOffset = Number.parseInt(idCreate().slice(0, 8), 36) % (80 * 366 * 24 * 60 * 60 * 1000);
    const start = new Date(Date.UTC(2400, 0, 1) + millisecondOffset);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { start, end, at: (offsetMs: number) => new Date(start.getTime() + offsetMs) };
}

async function seedCook(firstName: string) {
    const setup = await commandSetup.withUser({ firstName, lastName: 'Stats' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    const customer = await commandSetup.withUser({ firstName: 'Guest', lastName: firstName });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
        cookId: setup.user.userId,
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
    return { setup, customer, bookingRequestOfferId };
}

describe('adminCallCookStatsFindMany', () => {
    it('counts in-range rooms and terminal slots, plus current customer-pending slots', async () => {
        // Arrange
        const range = isolatedRange();
        const alpha = await seedCook(`Alpha${idCreate().slice(0, 4)}`);
        const beta = await seedCook(`Beta${idCreate().slice(0, 4)}`);
        await testDb.insert(bookingRequestOfferCallRooms).values([
            {
                bookingRequestOfferCallRoomId: idCreate(),
                bookingRequestOfferId: alpha.bookingRequestOfferId,
                livekitRoomName: `alpha-a-${idCreate()}`,
                status: 'ENDED',
                createdByUserId: alpha.setup.user.userId,
                startedAt: range.at(60_000),
            },
            {
                bookingRequestOfferCallRoomId: idCreate(),
                bookingRequestOfferId: alpha.bookingRequestOfferId,
                livekitRoomName: `alpha-b-${idCreate()}`,
                status: 'ACTIVE',
                createdByUserId: alpha.setup.user.userId,
                startedAt: range.at(120_000),
            },
            {
                bookingRequestOfferCallRoomId: idCreate(),
                bookingRequestOfferId: alpha.bookingRequestOfferId,
                livekitRoomName: `alpha-out-${idCreate()}`,
                status: 'ENDED',
                createdByUserId: alpha.setup.user.userId,
                startedAt: new Date(range.start.getTime() - 24 * 60 * 60 * 1000),
            },
            {
                bookingRequestOfferCallRoomId: idCreate(),
                bookingRequestOfferId: beta.bookingRequestOfferId,
                livekitRoomName: `beta-${idCreate()}`,
                status: 'ACTIVE',
                createdByUserId: beta.setup.user.userId,
                startedAt: range.at(180_000),
            },
        ]);
        const slot = (
            cook: typeof alpha,
            status: 'COMPLETED' | 'DECLINED' | 'CANCELED' | 'PENDING',
            initiator: 'COOK' | 'CUSTOMER',
            lastModifiedAt: Date,
        ) => ({
            cookCallSlotBookingId: idCreate(),
            cookId: cook.setup.user.userId,
            userId: cook.customer.user.userId,
            bookingRequestOfferId: cook.bookingRequestOfferId,
            initiator,
            status,
            startAt: new Date('2034-01-01T10:00:00.000Z'),
            endAt: new Date('2034-01-01T10:30:00.000Z'),
            lastModifiedAt,
        });
        await testDb
            .insert(cookCallSlotBookings)
            .values([
                slot(alpha, 'COMPLETED', 'CUSTOMER', range.at(5 * 60_000)),
                slot(alpha, 'DECLINED', 'COOK', range.at(6 * 60_000)),
                slot(alpha, 'CANCELED', 'CUSTOMER', range.at(7 * 60_000)),
                slot(alpha, 'DECLINED', 'COOK', new Date(range.start.getTime() - 24 * 60 * 60 * 1000)),
                slot(alpha, 'PENDING', 'CUSTOMER', range.at(8 * 60_000)),
                slot(alpha, 'PENDING', 'CUSTOMER', range.at(9 * 60_000)),
                slot(alpha, 'PENDING', 'COOK', range.at(10 * 60_000)),
            ]);

        // Act
        const byRooms = await adminCallCookStatsFindMany(
            { range: { startDateTime: range.start, endDateTime: range.end }, sortBy: 'roomCount', take: 25 },
            alpha.setup.requestingSession,
            alpha.setup.serverRuntime,
        );
        const byCompleted = await adminCallCookStatsFindMany(
            { range: { startDateTime: range.start, endDateTime: range.end }, sortBy: 'completedSlotCount', take: 5 },
            alpha.setup.requestingSession,
            alpha.setup.serverRuntime,
        );
        const byDeclined = await adminCallCookStatsFindMany(
            { range: { startDateTime: range.start, endDateTime: range.end }, sortBy: 'declinedCount', take: 5 },
            alpha.setup.requestingSession,
            alpha.setup.serverRuntime,
        );

        // Assert
        expect(byRooms[0]?.cookId).toBe(alpha.setup.user.userId);
        expect(byRooms[1]?.cookId).toBe(beta.setup.user.userId);
        expect(byRooms[0]).toMatchObject({
            displayName: alpha.setup.user.firstName,
            roomCount: 2,
            completedSlotCount: 1,
            declinedCount: 1,
            canceledCount: 1,
            pendingAwaitingCookCount: 2,
        });
        expect(byRooms[1]).toMatchObject({
            roomCount: 1,
            completedSlotCount: 0,
            declinedCount: 0,
            canceledCount: 0,
            pendingAwaitingCookCount: 0,
        });
        expect(byCompleted[0]?.cookId).toBe(alpha.setup.user.userId);
        expect(byDeclined[0]?.cookId).toBe(alpha.setup.user.userId);
    });

    it('breaks room-count ties by display name', async () => {
        // Arrange
        const range = isolatedRange();
        const token = idCreate().slice(0, 6);
        const early = await seedCook(`Aaa${token}`);
        const late = await seedCook(`Zzz${token}`);
        await testDb.insert(bookingRequestOfferCallRooms).values([
            {
                bookingRequestOfferCallRoomId: idCreate(),
                bookingRequestOfferId: early.bookingRequestOfferId,
                livekitRoomName: `tie-a-${idCreate()}`,
                status: 'ACTIVE',
                createdByUserId: early.setup.user.userId,
                startedAt: range.at(60_000),
            },
            {
                bookingRequestOfferCallRoomId: idCreate(),
                bookingRequestOfferId: late.bookingRequestOfferId,
                livekitRoomName: `tie-z-${idCreate()}`,
                status: 'ACTIVE',
                createdByUserId: late.setup.user.userId,
                startedAt: range.at(120_000),
            },
        ]);

        // Act
        const rows = await adminCallCookStatsFindMany(
            { range: { startDateTime: range.start, endDateTime: range.end }, sortBy: 'roomCount', take: 10 },
            early.setup.requestingSession,
            early.setup.serverRuntime,
        );

        // Assert
        expect(rows[0]?.cookId).toBe(early.setup.user.userId);
        expect(rows[1]?.cookId).toBe(late.setup.user.userId);
    });

    it('returns only the highest room-count cook when take is 1', async () => {
        // Arrange
        const range = isolatedRange();
        const alpha = await seedCook(`Top${idCreate().slice(0, 4)}`);
        const beta = await seedCook(`Next${idCreate().slice(0, 4)}`);
        await testDb.insert(bookingRequestOfferCallRooms).values([
            {
                bookingRequestOfferCallRoomId: idCreate(),
                bookingRequestOfferId: alpha.bookingRequestOfferId,
                livekitRoomName: `top-a-${idCreate()}`,
                status: 'ACTIVE',
                createdByUserId: alpha.setup.user.userId,
                startedAt: range.at(60_000),
            },
            {
                bookingRequestOfferCallRoomId: idCreate(),
                bookingRequestOfferId: alpha.bookingRequestOfferId,
                livekitRoomName: `top-b-${idCreate()}`,
                status: 'ENDED',
                createdByUserId: alpha.setup.user.userId,
                startedAt: range.at(120_000),
            },
            {
                bookingRequestOfferCallRoomId: idCreate(),
                bookingRequestOfferId: beta.bookingRequestOfferId,
                livekitRoomName: `next-${idCreate()}`,
                status: 'ACTIVE',
                createdByUserId: beta.setup.user.userId,
                startedAt: range.at(180_000),
            },
        ]);

        // Act
        const rows = await adminCallCookStatsFindMany(
            { range: { startDateTime: range.start, endDateTime: range.end }, sortBy: 'roomCount', take: 1 },
            alpha.setup.requestingSession,
            alpha.setup.serverRuntime,
        );

        // Assert
        expect(rows).toHaveLength(1);
        expect(rows[0]?.cookId).toBe(alpha.setup.user.userId);
        expect(rows[0]?.roomCount).toBe(2);
    });

    it('sorts by pending slots that are waiting on the cook', async () => {
        // Arrange
        const range = isolatedRange();
        const busier = await seedCook(`Busy${idCreate().slice(0, 4)}`);
        const quieter = await seedCook(`Quiet${idCreate().slice(0, 4)}`);
        const pending = (cook: typeof busier) => ({
            cookCallSlotBookingId: idCreate(),
            cookId: cook.setup.user.userId,
            userId: cook.customer.user.userId,
            bookingRequestOfferId: cook.bookingRequestOfferId,
            initiator: 'CUSTOMER' as const,
            status: 'PENDING' as const,
            startAt: new Date('2034-02-01T10:00:00.000Z'),
            endAt: new Date('2034-02-01T10:30:00.000Z'),
        });
        await testDb
            .insert(cookCallSlotBookings)
            .values([
                pending(busier),
                pending(busier),
                pending(busier),
                pending(busier),
                pending(busier),
                pending(busier),
                pending(quieter),
                pending(quieter),
                pending(quieter),
                pending(quieter),
            ]);

        // Act
        const rows = await adminCallCookStatsFindMany(
            { range: { startDateTime: range.start, endDateTime: range.end }, sortBy: 'pendingAwaitingCookCount', take: 100 },
            busier.setup.requestingSession,
            busier.setup.serverRuntime,
        );

        // Assert
        const busyRow = rows.find((row) => row.cookId === busier.setup.user.userId);
        const quietRow = rows.find((row) => row.cookId === quieter.setup.user.userId);
        expect(busyRow?.pendingAwaitingCookCount).toBe(6);
        expect(quietRow?.pendingAwaitingCookCount).toBe(4);
        expect(rows.findIndex((row) => row.cookId === busier.setup.user.userId)).toBeLessThan(
            rows.findIndex((row) => row.cookId === quieter.setup.user.userId),
        );
    });
});
