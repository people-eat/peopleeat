import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminMapBookingRequestPointsFindMany } from './adminMapBookingRequestPointsFindMany';

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

function addressAt(latitude: number, longitude: number) {
    return { ...berlin, latitude, longitude };
}

describe('adminMapBookingRequestPointsFindMany', () => {
    it('maps status and coordinates for requests created inside the range', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Map' });
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Map' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const startMs = Date.UTC(2600, 6, 10) + Math.floor(Math.random() * 1e10);
        const startDateTime = new Date(startMs);
        const endDateTime = new Date(startMs + 2 * 86_400_000);
        const createdAt = new Date(startMs + 3_600_000);
        const eventDate = new Date(Date.now() + 14 * 86_400_000);
        const waitingId = idCreate();
        const canceledId = idCreate();
        const expiredId = idCreate();
        const reviewId = idCreate();
        const pendingId = idCreate();
        const outsideId = idCreate();
        await testDb.insert(bookingRequests).values([
            {
                bookingRequestId: waitingId,
                userId: customer.user.userId,
                occasion: `waiting-${waitingId}`,
                dateTime: eventDate,
                exactEventAddress: addressAt(52.1, 13.1),
                originalMessage: 'Waiting',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
                createdAt,
            },
            {
                bookingRequestId: canceledId,
                userId: customer.user.userId,
                occasion: `canceled-${canceledId}`,
                dateTime: eventDate,
                exactEventAddress: addressAt(52.2, 13.2),
                originalMessage: 'Canceled',
                publicationStatus: 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
                preferences: [],
                canceledAt: new Date('2030-01-01T00:00:00.000Z'),
                createdAt,
            },
            {
                bookingRequestId: expiredId,
                userId: customer.user.userId,
                occasion: `expired-${expiredId}`,
                dateTime: eventDate,
                exactEventAddress: addressAt(52.3, 13.3),
                originalMessage: 'Expired',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
                expiresAt: new Date('2000-01-01T00:00:00.000Z'),
                createdAt,
            },
            {
                bookingRequestId: reviewId,
                userId: customer.user.userId,
                occasion: `review-${reviewId}`,
                dateTime: eventDate,
                exactEventAddress: addressAt(52.4, 13.4),
                originalMessage: 'Review',
                publicationStatus: 'PUBLICATION_APPROVED_BY_ADMIN',
                preferences: [],
                createdAt,
            },
            {
                bookingRequestId: pendingId,
                userId: customer.user.userId,
                occasion: `pending-${pendingId}`,
                dateTime: eventDate,
                exactEventAddress: addressAt(52.5, 13.5),
                originalMessage: 'Pending',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
                createdAt,
            },
            {
                bookingRequestId: outsideId,
                userId: customer.user.userId,
                occasion: `outside-${outsideId}`,
                dateTime: eventDate,
                exactEventAddress: addressAt(52.6, 13.6),
                originalMessage: 'Outside',
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                preferences: [],
                createdAt: new Date(startMs - 86_400_000),
            },
        ]);
        const offerMoney = {
            cookId: cook.user.userId,
            menuPriceCents: 5000,
            travelExpensesCents: 0,
            paymentProviderFeeCents: 0,
            platformFeePercentCook: 10,
            platformFeePercentCustomer: 10,
            platformFeeCentsCook: 500,
            platformFeeCentsCustomer: 500,
            payoutCentsCook: 4500,
            totalWithoutDiscountsCentsCustomer: 5500,
        };
        await testDb.insert(bookingRequestOffers).values([
            { bookingRequestOfferId: idCreate(), bookingRequestId: reviewId, ...offerMoney },
            {
                bookingRequestOfferId: idCreate(),
                bookingRequestId: pendingId,
                ...offerMoney,
                userAccepted: true,
                cookAccepted: true,
                paymentStatus: 'PAYED',
            },
        ]);

        // Act
        const points = await adminMapBookingRequestPointsFindMany(
            { range: { startDateTime, endDateTime } },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        const byId = new Map(points.map((point) => [point.bookingRequestId, point]));
        expect(byId.get(waitingId)).toMatchObject({
            latitude: 52.1,
            longitude: 13.1,
            status: 'WAITING_FOR_OFFERS',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            occasion: `waiting-${waitingId}`,
        });
        expect(byId.get(canceledId)).toMatchObject({
            status: 'CANCELED',
            publicationStatus: 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
            latitude: 52.2,
            longitude: 13.2,
        });
        expect(byId.get(expiredId)?.status).toBe('EXPIRED');
        expect(byId.get(reviewId)?.status).toBe('OFFERS_WAITING_FOR_REVIEW');
        expect(byId.get(pendingId)?.status).toBe('EVENT_PENDING');
        expect(byId.has(outsideId)).toBe(false);
    });
});
