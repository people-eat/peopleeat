import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../../db/schema';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { bookingRequestExpireNotify } from './bookingRequestExpireNotify';

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

async function seedBookingRequest(options: {
    expiresAt: Date | null;
    canceledAt?: Date | null;
    withOffer?: { cookAccepted: boolean | null; userAccepted: boolean | null };
}) {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Expire' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        expiresAt: options.expiresAt,
        canceledAt: options.canceledAt ?? null,
    });

    let cookId: string | undefined;
    if (options.withOffer) {
        const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Expire' });
        cookId = cookSetup.user.userId;
        await testDb.insert(cooks).values({
            cookId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: berlin,
            travelExpensesAmount: 25,
            maximumTravelDistance: 100,
        });
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId,
            cookId,
            cookAccepted: options.withOffer.cookAccepted,
            userAccepted: options.withOffer.userAccepted,
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
            paymentProviderFeeCents: 500,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 0,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 0,
            payoutCentsCook: 18_400,
            totalWithoutDiscountsCentsCustomer: 23_000,
            totalCentsCustomer: 23_000,
        });
    }

    return { customer, bookingRequestId, cookId };
}

function publishedUserIds(serverRuntime: Awaited<ReturnType<typeof commandSetup.withUser>>['serverRuntime']): string[] {
    return vi.mocked(serverRuntime.publish.userUpdates).mock.calls.map(([arg]) => arg.userId);
}

describe('bookingRequestExpireNotify', () => {
    it('publishes customer, cook, and admin for an expired request with an offer', async () => {
        // Arrange
        const { customer, cookId, bookingRequestId } = await seedBookingRequest({
            expiresAt: new Date(Date.now() - 30 * 60 * 1000),
            withOffer: { cookAccepted: true, userAccepted: null },
        });

        // Act
        await bookingRequestExpireNotify.handler({ data: { bookingRequestId }, serverRuntime: customer.serverRuntime });

        // Assert
        const userIds = publishedUserIds(customer.serverRuntime);
        expect(userIds).toContain(customer.user.userId);
        expect(userIds).toContain(cookId);
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('publishes customer and admin when there is no offer', async () => {
        // Arrange
        const { customer, bookingRequestId } = await seedBookingRequest({
            expiresAt: new Date(Date.now() - 45 * 60 * 1000),
        });

        // Act
        await bookingRequestExpireNotify.handler({ data: { bookingRequestId }, serverRuntime: customer.serverRuntime });

        // Assert
        expect(publishedUserIds(customer.serverRuntime)).toContain(customer.user.userId);
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('excludes requests that have a dual-accepted offer', async () => {
        // Arrange
        const { customer, cookId, bookingRequestId } = await seedBookingRequest({
            expiresAt: new Date(Date.now() - 30 * 60 * 1000),
            withOffer: { cookAccepted: true, userAccepted: true },
        });

        // Act
        await bookingRequestExpireNotify.handler({ data: { bookingRequestId }, serverRuntime: customer.serverRuntime });

        // Assert
        const userIds = publishedUserIds(customer.serverRuntime);
        expect(userIds).not.toContain(customer.user.userId);
        expect(userIds).not.toContain(cookId);
    });

    it('no-ops when expiresAt is still in the future', async () => {
        // Arrange
        const { customer, bookingRequestId } = await seedBookingRequest({
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });

        // Act
        await bookingRequestExpireNotify.handler({ data: { bookingRequestId }, serverRuntime: customer.serverRuntime });

        // Assert
        expect(customer.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(customer.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('no-ops when expiresAt was cleared', async () => {
        // Arrange
        const { customer, bookingRequestId } = await seedBookingRequest({
            expiresAt: null,
        });

        // Act
        await bookingRequestExpireNotify.handler({ data: { bookingRequestId }, serverRuntime: customer.serverRuntime });

        // Assert
        expect(customer.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
