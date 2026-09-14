import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../../db/schema';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { bookingRequestOfferPullPaymentAnnouncementEmailSend } from '../../utils/bookingRequestLifecycleEmails';
import { bookingRequestOfferPullPaymentAnnouncement } from './bookingRequestOfferPullPaymentAnnouncement';

vi.mock('../../utils/bookingRequestLifecycleEmails', () => ({
    bookingRequestOfferPullPaymentAnnouncementEmailSend: vi.fn(async () => {}),
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

async function seedOffer(options?: { paymentStatus?: 'SETUP' | 'PAYED' | 'EMPTY' }) {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Announce' });
    await testDb.insert(cooks).values({
        cookId: cookSetup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_announce',
        stripeAccountActive: true,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Announce' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });

    const bookingRequestOfferId = idCreate();
    const plannedPaymentPullDateTime = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cookSetup.user.userId,
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
        paymentStatus: options?.paymentStatus ?? 'SETUP',
        paymentData: { setupIntentId: 'si_announce', clientSecret: 'si_announce_secret' },
        plannedPaymentPullDateTime,
    });

    return {
        serverRuntime: cookSetup.serverRuntime,
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cookSetup.user.userId,
        customerUserId: customer.user.userId,
        plannedPaymentPullDateTime,
    };
}

describe('bookingRequestOfferPullPaymentAnnouncement', () => {
    it('sends the announcement email and publishes when the offer is SETUP', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferId, bookingRequestId, cookId, customerUserId, plannedPaymentPullDateTime } =
            await seedOffer({ paymentStatus: 'SETUP' });

        // Act
        await bookingRequestOfferPullPaymentAnnouncement.handler({
            data: { bookingRequestOfferId },
            serverRuntime,
        });

        // Assert
        expect(bookingRequestOfferPullPaymentAnnouncementEmailSend).toHaveBeenCalledWith(serverRuntime, {
            bookingRequestOfferId,
            bookingRequestId,
            customerUserId,
            totalCentsCustomer: 23_000,
            pullPaymentDate: plannedPaymentPullDateTime,
        });
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customerUserId });
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cookId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('no-ops when the offer is not SETUP', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferId } = await seedOffer({ paymentStatus: 'PAYED' });

        // Act
        await bookingRequestOfferPullPaymentAnnouncement.handler({
            data: { bookingRequestOfferId },
            serverRuntime,
        });

        // Assert
        expect(bookingRequestOfferPullPaymentAnnouncementEmailSend).not.toHaveBeenCalled();
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('no-ops when the offer is missing', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act
        await bookingRequestOfferPullPaymentAnnouncement.handler({
            data: { bookingRequestOfferId: idCreate() },
            serverRuntime,
        });

        // Assert
        expect(bookingRequestOfferPullPaymentAnnouncementEmailSend).not.toHaveBeenCalled();
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
