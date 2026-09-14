import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../../db/schema';
import { slackNotifyNoOffers } from '../../slack/slackNotifyBooking';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { bookingRequestNoOffersNotify } from './bookingRequestNoOffersNotify';

vi.mock('../../slack/slackNotifyBooking', () => ({
    slackNotifyNoOffers: vi.fn(async () => {}),
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

async function seedCook() {
    const setup = await commandSetup.withUser({ firstName: 'Cook', lastName: 'NoOffer' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isApprovedByAdmin: true,
        isVisible: true,
    });
    return setup.user.userId;
}

async function seedBookingRequest(args: {
    userId: string;
    occasion: string;
    canceledAt?: Date | null;
    withOffer?: { cookId: string };
}): Promise<string> {
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: args.userId,
        occasion: args.occasion,
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        canceledAt: args.canceledAt ?? null,
    });

    if (args.withOffer) {
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId,
            cookId: args.withOffer.cookId,
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

describe('bookingRequestNoOffersNotify', () => {
    it('notifies when the request still has no offers', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser({ firstName: 'Host', lastName: '24h' });
        const token = idCreate().slice(0, 8);
        const bookingRequestId = await seedBookingRequest({
            userId: user.userId,
            occasion: `NoOffer24-${token}`,
        });

        // Act
        await bookingRequestNoOffersNotify.handler({
            data: { bookingRequestId, hours: 24 },
            serverRuntime,
        });

        // Assert
        expect(slackNotifyNoOffers).toHaveBeenCalledWith(serverRuntime, { bookingRequestId, hours: 24 });
    });

    it('skips requests that already have an offer', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser({ firstName: 'Host', lastName: 'HasOffer' });
        const cookId = await seedCook();
        const token = idCreate().slice(0, 8);
        const bookingRequestId = await seedBookingRequest({
            userId: user.userId,
            occasion: `HasOffer24-${token}`,
            withOffer: { cookId },
        });

        // Act
        await bookingRequestNoOffersNotify.handler({
            data: { bookingRequestId, hours: 24 },
            serverRuntime,
        });

        // Assert
        expect(slackNotifyNoOffers).not.toHaveBeenCalled();
    });

    it('skips canceled requests', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser({ firstName: 'Host', lastName: 'Canceled' });
        const token = idCreate().slice(0, 8);
        const bookingRequestId = await seedBookingRequest({
            userId: user.userId,
            occasion: `Canceled-${token}`,
            canceledAt: new Date(),
        });

        // Act
        await bookingRequestNoOffersNotify.handler({
            data: { bookingRequestId, hours: 48 },
            serverRuntime,
        });

        // Assert
        expect(slackNotifyNoOffers).not.toHaveBeenCalled();
    });
});
