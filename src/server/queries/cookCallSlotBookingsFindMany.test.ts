import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookCallSlotBookingsFindMany } from './cookCallSlotBookingsFindMany';

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

async function seedCalendar() {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Calendar' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId });
    const customerSetup = await commandSetup.withUser({ firstName: 'Mina', lastName: 'Calendar' });
    const otherCook = await commandSetup.withUser({ firstName: 'Other', lastName: 'Calendar' });
    await testDb.insert(cooks).values({ cookId: otherCook.user.userId });
    const occasion = `Calendar-${idCreate()}`;
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customerSetup.user.userId,
        occasion,
        dateTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
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
    const otherOfferId = idCreate();
    const otherRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId: otherRequestId,
        userId: customerSetup.user.userId,
        occasion: 'Other dinner',
        dateTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId: otherOfferId,
        bookingRequestId: otherRequestId,
        cookId: otherCook.user.userId,
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

    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const later = new Date(soon.getTime() + 2 * 24 * 60 * 60 * 1000);
    const pastStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const ids = {
        pendingSoon: idCreate(),
        confirmedLater: idCreate(),
        pendingPast: idCreate(),
        declined: idCreate(),
        canceled: idCreate(),
        otherCook: idCreate(),
    };
    const row = (
        id: string,
        cookId: string,
        offerId: string,
        status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELED',
        startAt: Date,
    ) => ({
        cookCallSlotBookingId: id,
        cookId,
        userId: customerSetup.user.userId,
        bookingRequestOfferId: offerId,
        initiator: 'CUSTOMER' as const,
        status,
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60_000),
    });
    await testDb
        .insert(cookCallSlotBookings)
        .values([
            row(ids.pendingSoon, cookSetup.user.userId, bookingRequestOfferId, 'PENDING', soon),
            row(ids.confirmedLater, cookSetup.user.userId, bookingRequestOfferId, 'CONFIRMED', later),
            row(ids.pendingPast, cookSetup.user.userId, bookingRequestOfferId, 'PENDING', pastStart),
            row(ids.declined, cookSetup.user.userId, bookingRequestOfferId, 'DECLINED', soon),
            row(ids.canceled, cookSetup.user.userId, bookingRequestOfferId, 'CANCELED', soon),
            row(ids.otherCook, otherCook.user.userId, otherOfferId, 'PENDING', soon),
        ]);

    return { cookSetup, otherCook, occasion, soon, later, pastStart, ids };
}

describe('cookCallSlotBookingsFindMany', () => {
    it('returns upcoming pending and confirmed slots in start order for the cook', async () => {
        // Arrange
        const fixture = await seedCalendar();

        // Act
        const rows = await cookCallSlotBookingsFindMany(
            { cookId: fixture.cookSetup.user.userId } as GqlSCook,
            { criterion: null },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.cookCallSlotBookingId)).toEqual([fixture.ids.pendingSoon, fixture.ids.confirmedLater]);
        expect(rows[0]).toMatchObject({
            customer: { display: 'Mina' },
            occasion: fixture.occasion,
            status: 'PENDING',
            initiator: 'CUSTOMER',
        });
    });

    it('treats an empty status list like the default upcoming filter', async () => {
        // Arrange
        const fixture = await seedCalendar();

        // Act
        const rows = await cookCallSlotBookingsFindMany(
            { cookId: fixture.cookSetup.user.userId } as GqlSCook,
            { criterion: { statuses: [] } },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.cookCallSlotBookingId)).toEqual([fixture.ids.pendingSoon, fixture.ids.confirmedLater]);
    });

    it('returns only the requested statuses, including a past pending slot when the default window is off', async () => {
        // Arrange
        const fixture = await seedCalendar();
        const parent = { cookId: fixture.cookSetup.user.userId } as GqlSCook;

        // Act
        const declined = await cookCallSlotBookingsFindMany(
            parent,
            { criterion: { statuses: ['DECLINED'] } },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );
        const closed = await cookCallSlotBookingsFindMany(
            parent,
            { criterion: { statuses: ['CANCELED', 'COMPLETED'] } },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );
        const pending = await cookCallSlotBookingsFindMany(
            parent,
            { criterion: { statuses: ['PENDING'] } },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(declined.map((row) => row.cookCallSlotBookingId)).toEqual([fixture.ids.declined]);
        expect(closed.map((row) => row.cookCallSlotBookingId)).toEqual([fixture.ids.canceled]);
        expect(pending.map((row) => row.cookCallSlotBookingId)).toEqual([fixture.ids.pendingPast, fixture.ids.pendingSoon]);
    });

    it('bounds startAt with an inclusive from and an exclusive to', async () => {
        // Arrange
        const fixture = await seedCalendar();
        const parent = { cookId: fixture.cookSetup.user.userId } as GqlSCook;

        // Act
        const upcomingWindow = await cookCallSlotBookingsFindMany(
            parent,
            { criterion: { from: new Date(fixture.soon.getTime() - 60_000), to: new Date(fixture.later.getTime()) } },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );
        const pastWindow = await cookCallSlotBookingsFindMany(
            parent,
            {
                criterion: {
                    from: new Date(fixture.pastStart.getTime() - 60_000),
                    to: new Date(fixture.pastStart.getTime() + 60_000),
                },
            },
            fixture.cookSetup.requestingSession,
            fixture.cookSetup.serverRuntime,
        );

        // Assert
        expect(upcomingWindow.map((row) => row.cookCallSlotBookingId)).toEqual([fixture.ids.pendingSoon]);
        expect(pastWindow.map((row) => row.cookCallSlotBookingId)).toEqual([fixture.ids.pendingPast]);
    });

    it('returns only slots that belong to the requested cook', async () => {
        // Arrange
        const fixture = await seedCalendar();

        // Act
        const rows = await cookCallSlotBookingsFindMany(
            { cookId: fixture.otherCook.user.userId } as GqlSCook,
            { criterion: { statuses: ['PENDING', 'CONFIRMED', 'DECLINED', 'CANCELED', 'COMPLETED'] } },
            fixture.otherCook.requestingSession,
            fixture.otherCook.serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.cookCallSlotBookingId)).toEqual([fixture.ids.otherCook]);
    });
});
