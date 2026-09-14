import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../../db/schema';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { bookingRequestOfferChatMessageNotifyEmailSend } from '../../utils/bookingRequestOfferChatMessageNotifyEmails';
import { bookingRequestOfferChatMessageNotify } from './bookingRequestOfferChatMessageNotify';

vi.mock('../../utils/bookingRequestOfferChatMessageNotifyEmails', () => ({
    bookingRequestOfferChatMessageNotifyEmailSend: vi.fn(async () => {}),
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

async function seedOffer(options?: { cookUnread?: number; userUnread?: number }) {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Chat' });
    await testDb.insert(cooks).values({
        cookId: cookSetup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
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
    });

    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cookSetup.user.userId,
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
        cookUnreadNotificationCount: options?.cookUnread ?? 0,
        userUnreadNotificationCount: options?.userUnread ?? 0,
    });

    return { cookSetup, customer, bookingRequestOfferId };
}

describe('bookingRequestOfferChatMessageNotify', () => {
    it('sends for COOK audience when cook unread is greater than zero', async () => {
        // Arrange
        const { cookSetup, bookingRequestOfferId } = await seedOffer({ cookUnread: 3 });

        // Act
        await bookingRequestOfferChatMessageNotify.handler({
            data: { bookingRequestOfferId, audience: 'COOK' },
            serverRuntime: cookSetup.serverRuntime,
        });

        // Assert
        expect(bookingRequestOfferChatMessageNotifyEmailSend).toHaveBeenCalledWith(cookSetup.serverRuntime, {
            bookingRequestOfferId,
            audience: 'COOK',
        });
    });

    it('no-ops for COOK audience when cook unread is zero', async () => {
        // Arrange
        const { cookSetup, bookingRequestOfferId } = await seedOffer({ cookUnread: 0 });

        // Act
        await bookingRequestOfferChatMessageNotify.handler({
            data: { bookingRequestOfferId, audience: 'COOK' },
            serverRuntime: cookSetup.serverRuntime,
        });

        // Assert
        expect(bookingRequestOfferChatMessageNotifyEmailSend).not.toHaveBeenCalled();
    });

    it('sends for CUSTOMER audience when user unread is greater than zero', async () => {
        // Arrange
        const { customer, bookingRequestOfferId } = await seedOffer({ userUnread: 1 });

        // Act
        await bookingRequestOfferChatMessageNotify.handler({
            data: { bookingRequestOfferId, audience: 'CUSTOMER' },
            serverRuntime: customer.serverRuntime,
        });

        // Assert
        expect(bookingRequestOfferChatMessageNotifyEmailSend).toHaveBeenCalledWith(customer.serverRuntime, {
            bookingRequestOfferId,
            audience: 'CUSTOMER',
        });
    });
});
