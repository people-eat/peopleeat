import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../../db/schema';
import type { BookingRequestOfferPaymentStatus } from '../../domain/bookingRequest';
import { slackNotifyEventTomorrow } from '../../slack/slackNotifyBooking';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { bookingRequestOfferEventTomorrowNotify } from './bookingRequestOfferEventTomorrowNotify';

vi.mock('../../slack/slackNotifyBooking', () => ({
    slackNotifyEventTomorrow: vi.fn(async () => {}),
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

const hourMs = 60 * 60 * 1000;

async function seedCookAndCustomer(token: string) {
    const customer = await commandSetup.withUser({ firstName: `Customer-${token}`, lastName: 'Host' });
    const cook = await commandSetup.withUser({ firstName: `Cook-${token}`, lastName: 'Chef' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isApprovedByAdmin: true,
        isVisible: true,
    });
    return { customer, cook };
}

async function seedDualAcceptedOffer(args: {
    customerUserId: string;
    cookId: string;
    occasion: string;
    eventDateTime: Date;
    paymentStatus: BookingRequestOfferPaymentStatus;
}): Promise<{ bookingRequestId: string; bookingRequestOfferId: string }> {
    const bookingRequestId = idCreate();
    const bookingRequestOfferId = idCreate();

    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: args.customerUserId,
        occasion: args.occasion,
        dateTime: args.eventDateTime,
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });

    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: args.cookId,
        cookAccepted: true,
        userAccepted: true,
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
        paymentStatus: args.paymentStatus,
        paymentDateTime: args.paymentStatus === 'EMPTY' || args.paymentStatus === 'SETUP' ? null : new Date(),
    });

    return { bookingRequestId, bookingRequestOfferId };
}

describe('bookingRequestOfferEventTomorrowNotify', () => {
    it('notifies paid dual-accepted offers', async () => {
        // Arrange
        const token = idCreate().slice(0, 8);
        const { customer, cook } = await seedCookAndCustomer(token);
        const { serverRuntime } = customer;
        const { bookingRequestId, bookingRequestOfferId } = await seedDualAcceptedOffer({
            customerUserId: customer.user.userId,
            cookId: cook.user.userId,
            occasion: `TomorrowPaid-${token}`,
            eventDateTime: new Date(Date.now() + 30 * hourMs),
            paymentStatus: 'PAYED',
        });

        // Act
        await bookingRequestOfferEventTomorrowNotify.handler({
            data: { bookingRequestId, bookingRequestOfferId },
            serverRuntime,
        });

        // Assert
        expect(slackNotifyEventTomorrow).toHaveBeenCalledWith(serverRuntime, {
            bookingRequestId,
            bookingRequestOfferId,
        });
    });

    it('skips unpaid dual-accepted offers', async () => {
        // Arrange
        const token = idCreate().slice(0, 8);
        const { customer, cook } = await seedCookAndCustomer(token);
        const { serverRuntime } = customer;
        const { bookingRequestId, bookingRequestOfferId } = await seedDualAcceptedOffer({
            customerUserId: customer.user.userId,
            cookId: cook.user.userId,
            occasion: `TomorrowUnpaid-${token}`,
            eventDateTime: new Date(Date.now() + 30 * hourMs),
            paymentStatus: 'EMPTY',
        });

        // Act
        await bookingRequestOfferEventTomorrowNotify.handler({
            data: { bookingRequestId, bookingRequestOfferId },
            serverRuntime,
        });

        // Assert
        expect(slackNotifyEventTomorrow).not.toHaveBeenCalled();
    });
});
