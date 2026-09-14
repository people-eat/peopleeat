import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../../db/schema';
import { bookingRequestStatusDerive } from '../../domain/bookingRequest';
import type * as BookingRequestDomain from '../../domain/bookingRequest';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { bookingRequestSlackDigest } from './bookingRequestSlackDigest';

const deriveState = vi.hoisted(() => ({
    // Real derive restored in beforeEach; typed loosely because vi.hoisted runs before imports.
    impl: null as null | typeof bookingRequestStatusDerive,
}));

vi.mock('../../domain/bookingRequest', async (importOriginal) => {
    const actual = await importOriginal<typeof BookingRequestDomain>();
    deriveState.impl = actual.bookingRequestStatusDerive;
    return {
        ...actual,
        bookingRequestStatusDerive: vi.fn((input: Parameters<typeof actual.bookingRequestStatusDerive>[0]) =>
            actual.bookingRequestStatusDerive(input),
        ),
    };
});

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

const hourMs = 60 * 60 * 1000;

async function seedOpenBookingRequest(args: {
    userId: string;
    occasion: string;
    dateTime: Date;
    withPendingOffer?: { cookId: string };
}): Promise<string> {
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: args.userId,
        occasion: args.occasion,
        dateTime: args.dateTime,
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        expiresAt: new Date(Date.now() + 30 * 24 * hourMs),
    });

    if (args.withPendingOffer) {
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId,
            cookId: args.withPendingOffer.cookId,
            cookAccepted: true,
            userAccepted: null,
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
            paymentStatus: 'EMPTY',
        });
    }

    return bookingRequestId;
}

describe('bookingRequestSlackDigest', () => {
    beforeEach(() => {
        const realDerive = deriveState.impl;
        if (!realDerive) {
            throw new Error('bookingRequestStatusDerive mock was not initialized');
        }
        vi.mocked(bookingRequestStatusDerive).mockImplementation(realDerive);
    });

    it('no-ops when bookingRequestReports channel is unset', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser({ firstName: 'Digest', lastName: 'Unset' });
        const token = idCreate().slice(0, 8);
        await seedOpenBookingRequest({
            userId: user.userId,
            occasion: `Unset-${token}`,
            dateTime: new Date(Date.now() + 14 * 24 * hourMs),
        });

        // Act
        await bookingRequestSlackDigest.handler({ data: undefined, serverRuntime });

        // Assert
        expect(serverRuntime.slack.postMessage).not.toHaveBeenCalled();
    });

    it('posts open WAITING_FOR_OFFERS and OFFERS_WAITING_FOR_REVIEW requests when channel is set', async () => {
        // Arrange
        const token = idCreate().slice(0, 8);
        const customer = await commandSetup.withUser({ firstName: `Open-${token}`, lastName: 'Host' });
        const cook = await commandSetup.withUser({ firstName: `Chef-${token}`, lastName: 'Cook' });
        await testDb.insert(cooks).values({
            cookId: cook.user.userId,
            isApprovedByAdmin: true,
            isVisible: true,
        });

        const { serverRuntime } = customer;
        serverRuntime.slack.channels.bookingRequestReports = 'C_REPORTS';
        vi.mocked(serverRuntime.slack.postMessage).mockResolvedValue({ ts: '9.9' });

        // Unique event times per run so parallel workers / shared-DB leftovers stay hidden.
        // nanoId tokens are not hex — derive ms from char codes instead of parseInt(..., 16).
        const tokenMs = (slice: string) => [...slice].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 1000;
        const waitingOffersAt = new Date(Date.UTC(2099, 5, 1, 12, 0, 0, tokenMs(token.slice(0, 4))));
        const waitingReviewAt = new Date(Date.UTC(2099, 5, 2, 12, 0, 0, tokenMs(token.slice(4, 8))));
        const realDerive = deriveState.impl;
        if (!realDerive) {
            throw new Error('bookingRequestStatusDerive mock was not initialized');
        }
        vi.mocked(bookingRequestStatusDerive).mockImplementation((input) => {
            const eventMs = input.eventDate.getTime();
            if (eventMs === waitingOffersAt.getTime() || eventMs === waitingReviewAt.getTime()) {
                return realDerive(input);
            }
            return 'CANCELED';
        });

        const waitingOffersId = await seedOpenBookingRequest({
            userId: customer.user.userId,
            occasion: `WaitingOffers-${token}`,
            dateTime: waitingOffersAt,
        });
        const waitingReviewId = await seedOpenBookingRequest({
            userId: customer.user.userId,
            occasion: `WaitingReview-${token}`,
            dateTime: waitingReviewAt,
            withPendingOffer: { cookId: cook.user.userId },
        });

        // Act
        await bookingRequestSlackDigest.handler({ data: undefined, serverRuntime });

        // Assert — digest lists customer name + admin link (not occasion).
        expect(serverRuntime.slack.postMessage).toHaveBeenCalledTimes(1);
        const args = vi.mocked(serverRuntime.slack.postMessage).mock.calls[0]![0];
        expect(args.channel).toBe('C_REPORTS');
        expect(args.text).toBe('Buchungsanfragen Report');
        const body = JSON.stringify(args.blocks);
        expect(body).toContain(`Open-${token}`);
        expect(body).toContain(waitingOffersId);
        expect(body).toContain(waitingReviewId);
        expect(body).toContain('Anfragen ohne Angebote (1)');
        expect(body).toContain('Anfragen mit offenen Angeboten (1)');
    });

    it('no-ops when open queues are empty', async () => {
        // Arrange — shared test DB may have leftover open requests; force derive so
        // both digest queues stay empty and the early return is exercised.
        const { serverRuntime } = await commandSetup();
        serverRuntime.slack.channels.bookingRequestReports = 'C_REPORTS';
        vi.mocked(bookingRequestStatusDerive).mockReturnValue('CANCELED');

        // Act
        await bookingRequestSlackDigest.handler({ data: undefined, serverRuntime });

        // Assert
        expect(serverRuntime.slack.postMessage).not.toHaveBeenCalled();
    });
});
