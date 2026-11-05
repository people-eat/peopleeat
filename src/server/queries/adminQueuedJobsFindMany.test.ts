import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferCallRooms, bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import { bookingRequestExpireNotify } from '../jobs/handlers/bookingRequestExpireNotify';
import { bookingRequestOfferPullPayment } from '../jobs/handlers/bookingRequestOfferPullPayment';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminQueuedJobsFindMany } from './adminQueuedJobsFindMany';

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
    state: 'created' | 'retry' | 'active' | 'completed';
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

async function seedOffer() {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Jobs' });
    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Jobs' });
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
    return { customer, cook, bookingRequestId, bookingRequestOfferId };
}

describe('adminQueuedJobsFindMany', () => {
    it('sorts pending jobs by startAfter and drops finished states', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Queued', lastName: 'Admin' });
        const earlier = new Date('2031-01-01T00:00:00.000Z');
        const later = new Date('2031-06-01T00:00:00.000Z');
        const createdId = idCreate();
        const activeId = idCreate();
        const bookingRequestId = idCreate();
        vi.mocked(setup.serverRuntime.jobs.findByData).mockImplementation(async (definition) => {
            if (definition === bookingRequestExpireNotify) {
                return [
                    queuedJob({
                        id: activeId,
                        name: bookingRequestExpireNotify.name,
                        data: { bookingRequestId },
                        state: 'active',
                        startAfter: later,
                    }),
                    queuedJob({
                        id: idCreate(),
                        name: bookingRequestExpireNotify.name,
                        data: { bookingRequestId },
                        state: 'completed',
                        startAfter: earlier,
                    }),
                    queuedJob({
                        id: createdId,
                        name: bookingRequestExpireNotify.name,
                        data: { bookingRequestId },
                        state: 'created',
                        startAfter: earlier,
                    }),
                ] as never;
            }
            return [];
        });

        // Act
        const jobs = await adminQueuedJobsFindMany(setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(jobs.map((job) => job.jobId)).toEqual([createdId, activeId]);
        expect(jobs[0]).toMatchObject({ state: 'CREATED', bookingRequestId, name: 'booking-request-expire-notify' });
        expect(jobs[1]).toMatchObject({ state: 'ACTIVE', bookingRequestId });
    });

    it('fills bookingRequestId from the offer row when the payload omits it', async () => {
        // Arrange
        const { customer, bookingRequestId, bookingRequestOfferId } = await seedOffer();
        const jobId = idCreate();
        vi.mocked(customer.serverRuntime.jobs.findByData).mockImplementation(async (definition) => {
            if (definition === bookingRequestOfferPullPayment) {
                return [
                    queuedJob({
                        id: jobId,
                        name: bookingRequestOfferPullPayment.name,
                        data: { bookingRequestOfferId },
                        state: 'retry',
                        startAfter: new Date('2032-01-01T00:00:00.000Z'),
                    }),
                ] as never;
            }
            return [];
        });

        // Act
        const jobs = await adminQueuedJobsFindMany(customer.requestingSession, customer.serverRuntime);

        // Assert
        expect(jobs).toHaveLength(1);
        expect(jobs[0]).toMatchObject({
            jobId,
            state: 'RETRY',
            bookingRequestOfferId,
            bookingRequestId,
            name: 'booking-request-offer-pull-payment',
        });
    });

    it('fills request and offer ids from a call-slot payload', async () => {
        // Arrange
        const seeded = await seedOffer();
        const cookCallSlotBookingId = idCreate();
        await testDb.insert(cookCallSlotBookings).values({
            cookCallSlotBookingId,
            cookId: seeded.cook.user.userId,
            userId: seeded.customer.user.userId,
            bookingRequestOfferId: seeded.bookingRequestOfferId,
            startAt: new Date('2033-01-01T10:00:00.000Z'),
            endAt: new Date('2033-01-01T10:30:00.000Z'),
            initiator: 'CUSTOMER',
        });
        const jobId = idCreate();
        vi.mocked(seeded.customer.serverRuntime.jobs.findByData).mockImplementation(async (definition) => {
            if (definition === bookingRequestExpireNotify) {
                return [
                    queuedJob({
                        id: jobId,
                        name: bookingRequestExpireNotify.name,
                        data: { cookCallSlotBookingId },
                        state: 'created',
                        startAfter: new Date('2033-01-02T00:00:00.000Z'),
                    }),
                ] as never;
            }
            return [];
        });

        // Act
        const jobs = await adminQueuedJobsFindMany(seeded.customer.requestingSession, seeded.customer.serverRuntime);

        // Assert
        expect(jobs).toHaveLength(1);
        expect(jobs[0]).toMatchObject({
            jobId,
            bookingRequestId: seeded.bookingRequestId,
            bookingRequestOfferId: seeded.bookingRequestOfferId,
        });
    });

    it('fills request and offer ids from a call-room payload', async () => {
        // Arrange
        const seeded = await seedOffer();
        const bookingRequestOfferCallRoomId = idCreate();
        await testDb.insert(bookingRequestOfferCallRooms).values({
            bookingRequestOfferCallRoomId,
            bookingRequestOfferId: seeded.bookingRequestOfferId,
            livekitRoomName: `room-${bookingRequestOfferCallRoomId}`,
            createdByUserId: seeded.customer.user.userId,
        });
        const jobId = idCreate();
        vi.mocked(seeded.customer.serverRuntime.jobs.findByData).mockImplementation(async (definition) => {
            if (definition === bookingRequestExpireNotify) {
                return [
                    queuedJob({
                        id: jobId,
                        name: bookingRequestExpireNotify.name,
                        data: { bookingRequestOfferCallRoomId },
                        state: 'created',
                        startAfter: new Date('2033-02-01T00:00:00.000Z'),
                    }),
                ] as never;
            }
            return [];
        });

        // Act
        const jobs = await adminQueuedJobsFindMany(seeded.customer.requestingSession, seeded.customer.serverRuntime);

        // Assert
        expect(jobs).toHaveLength(1);
        expect(jobs[0]).toMatchObject({
            jobId,
            bookingRequestId: seeded.bookingRequestId,
            bookingRequestOfferId: seeded.bookingRequestOfferId,
        });
    });

    it('returns an empty list when no queued jobs are pending', async () => {
        // Arrange
        const setup = await commandSetup();

        // Act
        const jobs = await adminQueuedJobsFindMany(setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(jobs).toEqual([]);
    });
});
