import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { GqlSAdminBookingRequest } from '../graphql/generated';
import { bookingRequestExpireNotify } from '../jobs/handlers/bookingRequestExpireNotify';
import { bookingRequestOfferPullPayment } from '../jobs/handlers/bookingRequestOfferPullPayment';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestQueuedJobsFindMany } from './adminBookingRequestQueuedJobsFindMany';

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

function queuedJob(args: {
    id: string;
    name: string;
    data: Record<string, unknown>;
    state: 'created' | 'retry' | 'completed';
    startAfter: Date;
}) {
    return {
        id: args.id,
        name: args.name,
        data: args.data,
        state: args.state,
        startAfter: args.startAfter,
        createdOn: args.startAfter,
    };
}

function parentFor(bookingRequestId: string, offerIds: string[]): GqlSAdminBookingRequest {
    return {
        bookingRequestId,
        offers: offerIds.map((bookingRequestOfferId) => ({ bookingRequestOfferId })),
    } as GqlSAdminBookingRequest;
}

describe('adminBookingRequestQueuedJobsFindMany', () => {
    it('merges request and offer jobs from the parent offer list, sorted by startAfter', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Request', lastName: 'Jobs' });
        const bookingRequestId = idCreate();
        const bookingRequestOfferId = idCreate();
        const earlier = new Date('2034-01-01T00:00:00.000Z');
        const later = new Date('2034-02-01T00:00:00.000Z');
        const offerJobId = idCreate();
        const requestJobId = idCreate();
        vi.mocked(setup.serverRuntime.jobs.findByData).mockImplementation(async (definition, data) => {
            const payload = data as { bookingRequestId?: string; bookingRequestOfferId?: string };
            if (definition === bookingRequestOfferPullPayment && payload.bookingRequestOfferId === bookingRequestOfferId) {
                return [
                    queuedJob({
                        id: offerJobId,
                        name: bookingRequestOfferPullPayment.name,
                        data: { bookingRequestOfferId },
                        state: 'created',
                        startAfter: earlier,
                    }),
                    queuedJob({
                        id: idCreate(),
                        name: bookingRequestOfferPullPayment.name,
                        data: { bookingRequestOfferId },
                        state: 'completed',
                        startAfter: earlier,
                    }),
                ] as never;
            }
            if (definition === bookingRequestExpireNotify && payload.bookingRequestId === bookingRequestId) {
                return [
                    queuedJob({
                        id: requestJobId,
                        name: bookingRequestExpireNotify.name,
                        data: { bookingRequestId },
                        state: 'retry',
                        startAfter: later,
                    }),
                ] as never;
            }
            return [];
        });

        // Act
        const jobs = await adminBookingRequestQueuedJobsFindMany(
            parentFor(bookingRequestId, [bookingRequestOfferId]),
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(jobs.map((job) => job.jobId)).toEqual([offerJobId, requestJobId]);
        expect(jobs[0]).toMatchObject({
            name: 'booking-request-offer-pull-payment',
            state: 'CREATED',
            bookingRequestOfferId,
        });
        expect(jobs[1]).toMatchObject({
            name: 'booking-request-expire-notify',
            state: 'RETRY',
            bookingRequestId,
        });
    });

    it('loads offer ids from the database when the parent offer list is empty', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Lookup' });
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Lookup' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const bookingRequestId = idCreate();
        const bookingRequestOfferId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Birthday',
            dateTime: new Date(Date.now() + 7 * 86_400_000),
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Looking for a chef',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId,
            bookingRequestId,
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
        });
        const jobId = idCreate();
        vi.mocked(customer.serverRuntime.jobs.findByData).mockImplementation(async (definition, data) => {
            const payload = data as { bookingRequestOfferId?: string };
            if (definition === bookingRequestOfferPullPayment && payload.bookingRequestOfferId === bookingRequestOfferId) {
                return [
                    queuedJob({
                        id: jobId,
                        name: bookingRequestOfferPullPayment.name,
                        data: { bookingRequestOfferId },
                        state: 'created',
                        startAfter: new Date('2034-03-01T00:00:00.000Z'),
                    }),
                ] as never;
            }
            return [];
        });

        // Act
        const jobs = await adminBookingRequestQueuedJobsFindMany(
            parentFor(bookingRequestId, []),
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(jobs.map((job) => job.jobId)).toEqual([jobId]);
        expect(jobs[0]?.bookingRequestOfferId).toBe(bookingRequestOfferId);
    });

    it('returns an empty list when the request has no pending jobs', async () => {
        // Arrange
        const setup = await commandSetup();
        const bookingRequestId = idCreate();

        // Act
        const jobs = await adminBookingRequestQueuedJobsFindMany(
            parentFor(bookingRequestId, []),
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(jobs).toEqual([]);
    });
});
