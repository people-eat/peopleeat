import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import type { CookCallSlotBookingCreate } from '../../db/schema';
import { bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../../db/schema';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { bookingRequestOfferCallSlotsComplete } from './bookingRequestOfferCallSlotsComplete';

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

async function seedCallSlotFixture() {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Slots' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId });

    const customerSetup = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Slots' });
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

    return {
        serverRuntime: customerSetup.serverRuntime,
        cookUserId: cookSetup.user.userId,
        customerUserId: customerSetup.user.userId,
        bookingRequestOfferId,
    };
}

async function insertCallSlotBooking(
    fixture: Awaited<ReturnType<typeof seedCallSlotFixture>>,
    overrides: Partial<CookCallSlotBookingCreate> & Pick<CookCallSlotBookingCreate, 'startAt' | 'endAt' | 'status'>,
) {
    const cookCallSlotBookingId = idCreate();
    await testDb.insert(cookCallSlotBookings).values({
        cookCallSlotBookingId,
        cookId: fixture.cookUserId,
        userId: fixture.customerUserId,
        bookingRequestOfferId: fixture.bookingRequestOfferId,
        initiator: 'CUSTOMER',
        ...overrides,
    });
    return cookCallSlotBookingId;
}

describe('bookingRequestOfferCallSlotsComplete', () => {
    it('marks CONFIRMED slots past endAt+15m as COMPLETED and publishes user+admin updates', async () => {
        // Arrange
        const fixture = await seedCallSlotFixture();
        const endAt = new Date(Date.now() - 20 * 60_000);
        const startAt = new Date(endAt.getTime() - 30 * 60_000);
        const cookCallSlotBookingId = await insertCallSlotBooking(fixture, {
            startAt,
            endAt,
            status: 'CONFIRMED',
        });

        // Act
        await bookingRequestOfferCallSlotsComplete.handler({
            data: { cookCallSlotBookingId },
            serverRuntime: fixture.serverRuntime,
        });

        // Assert
        const [row] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingId));
        expect(row?.status).toBe('COMPLETED');
        expect(fixture.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: fixture.customerUserId });
        expect(fixture.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: fixture.cookUserId });
        expect(fixture.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('cancels PENDING slots past endAt as EXPIRED_UNCONFIRMED and publishes updates', async () => {
        // Arrange
        const fixture = await seedCallSlotFixture();
        const endAt = new Date(Date.now() - 60_000);
        const startAt = new Date(endAt.getTime() - 30 * 60_000);
        const cookCallSlotBookingId = await insertCallSlotBooking(fixture, {
            startAt,
            endAt,
            status: 'PENDING',
        });

        // Act
        await bookingRequestOfferCallSlotsComplete.handler({
            data: { cookCallSlotBookingId },
            serverRuntime: fixture.serverRuntime,
        });

        // Assert
        const [row] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingId));
        expect(row?.status).toBe('CANCELED');
        expect(row?.canceledReason).toBe('EXPIRED_UNCONFIRMED');
        expect(fixture.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: fixture.customerUserId });
        expect(fixture.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: fixture.cookUserId });
        expect(fixture.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('leaves recent CONFIRMED slots within the 15m grace period untouched', async () => {
        // Arrange
        const fixture = await seedCallSlotFixture();
        const endAt = new Date(Date.now() - 5 * 60_000);
        const startAt = new Date(endAt.getTime() - 30 * 60_000);
        const cookCallSlotBookingId = await insertCallSlotBooking(fixture, {
            startAt,
            endAt,
            status: 'CONFIRMED',
        });

        // Act
        await bookingRequestOfferCallSlotsComplete.handler({
            data: { cookCallSlotBookingId },
            serverRuntime: fixture.serverRuntime,
        });

        // Assert
        const [row] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingId));
        expect(row?.status).toBe('CONFIRMED');
        expect(fixture.serverRuntime.publish.userUpdates).not.toHaveBeenCalledWith({ userId: fixture.customerUserId });
        expect(fixture.serverRuntime.publish.userUpdates).not.toHaveBeenCalledWith({ userId: fixture.cookUserId });
    });

    it('no-ops when slot is already canceled', async () => {
        // Arrange
        const fixture = await seedCallSlotFixture();
        const endAt = new Date(Date.now() - 60_000);
        const startAt = new Date(endAt.getTime() - 30 * 60_000);
        const cookCallSlotBookingId = await insertCallSlotBooking(fixture, {
            startAt,
            endAt,
            status: 'CANCELED',
        });

        // Act
        await bookingRequestOfferCallSlotsComplete.handler({
            data: { cookCallSlotBookingId },
            serverRuntime: fixture.serverRuntime,
        });

        // Assert
        expect(fixture.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(fixture.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });
});
