import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, cookTestimonials, customerTestimonials } from '../../db/schema';
import { slackNotifyTestimonialReminderSent } from '../../slack/slackNotifyBooking';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { bookingRequestOfferTestimonialReminder } from './bookingRequestOfferTestimonialReminder';

vi.mock('../../slack/slackNotifyBooking', () => ({
    slackNotifyTestimonialReminderSent: vi.fn(async () => {}),
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

async function seedPaidDualAcceptedOffer(options?: { paymentStatus?: 'PAYED' | 'SETUP' | 'EMPTY'; canceledAt?: Date | null }) {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Review' });
    await testDb.insert(cooks).values({
        cookId: cookSetup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_testimonial',
        stripeAccountActive: true,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Review' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        canceledAt: options?.canceledAt ?? null,
    });

    const bookingRequestOfferId = idCreate();
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
        paymentStatus: options?.paymentStatus ?? 'PAYED',
        paymentDateTime: new Date(),
        paymentData: { paymentIntentId: 'pi_testimonial', clientSecret: 'secret', transferId: 'tr_testimonial' },
    });

    return {
        serverRuntime: cookSetup.serverRuntime,
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cookSetup.user.userId,
        customerUserId: customer.user.userId,
    };
}

describe('bookingRequestOfferTestimonialReminder', () => {
    it('emails both parties without testimonials and notifies Slack', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferId, bookingRequestId, cookId, customerUserId } = await seedPaidDualAcceptedOffer();

        // Act
        await bookingRequestOfferTestimonialReminder.handler({
            data: { bookingRequestOfferId, kind: 'REMINDER_MORNING' },
            serverRuntime,
        });

        // Assert
        expect(serverRuntime.email.send).toHaveBeenCalledTimes(2);
        expect(serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: customerUserId,
                purpose: 'TESTIMONIAL_REMINDER_MORNING_CUSTOMER',
                relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: bookingRequestOfferId },
            }),
        );
        expect(serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: cookId,
                purpose: 'TESTIMONIAL_REMINDER_MORNING_COOK',
                relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: bookingRequestOfferId },
            }),
        );
        expect(slackNotifyTestimonialReminderSent).toHaveBeenCalledWith(serverRuntime, {
            bookingRequestId,
            kind: 'REMINDER_MORNING',
        });
    });

    it('skips a party that already left a testimonial', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferId, cookId, customerUserId } = await seedPaidDualAcceptedOffer();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId: idCreate(),
            userId: customerUserId,
            bookingRequestOfferId,
            body: 'Great dinner',
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date(),
        });

        // Act
        await bookingRequestOfferTestimonialReminder.handler({
            data: { bookingRequestOfferId, kind: 'MEMORY_NUDGE' },
            serverRuntime,
        });

        // Assert
        expect(serverRuntime.email.send).toHaveBeenCalledTimes(1);
        expect(serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: cookId,
                purpose: 'TESTIMONIAL_MEMORY_NUDGE_COOK',
            }),
        );
        expect(slackNotifyTestimonialReminderSent).toHaveBeenCalled();
    });

    it('no-ops when unpaid or canceled', async () => {
        // Arrange — unpaid
        const unpaid = await seedPaidDualAcceptedOffer({ paymentStatus: 'SETUP' });
        // Arrange — canceled
        const canceled = await seedPaidDualAcceptedOffer({ canceledAt: new Date() });

        // Act
        await bookingRequestOfferTestimonialReminder.handler({
            data: { bookingRequestOfferId: unpaid.bookingRequestOfferId, kind: 'REMINDER_EVENING' },
            serverRuntime: unpaid.serverRuntime,
        });
        await bookingRequestOfferTestimonialReminder.handler({
            data: { bookingRequestOfferId: canceled.bookingRequestOfferId, kind: 'REMINDER_EVENING' },
            serverRuntime: canceled.serverRuntime,
        });

        // Assert
        expect(unpaid.serverRuntime.email.send).not.toHaveBeenCalled();
        expect(canceled.serverRuntime.email.send).not.toHaveBeenCalled();
        expect(slackNotifyTestimonialReminderSent).not.toHaveBeenCalled();
    });

    it('skips Slack when both parties already have testimonials', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferId, cookId, customerUserId } = await seedPaidDualAcceptedOffer();
        await testDb.insert(customerTestimonials).values({
            customerTestimonialId: idCreate(),
            userId: customerUserId,
            bookingRequestOfferId,
            body: 'Loved it',
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date(),
        });
        await testDb.insert(cookTestimonials).values({
            cookTestimonialId: idCreate(),
            userId: cookId,
            cookId,
            bookingRequestOfferId,
            body: 'Great guests',
            rating: 5,
            publicationStatus: 'PUBLISHED',
            publishedAt: new Date(),
        });

        // Act
        await bookingRequestOfferTestimonialReminder.handler({
            data: { bookingRequestOfferId, kind: 'REMINDER_MORNING' },
            serverRuntime,
        });

        // Assert
        expect(serverRuntime.email.send).not.toHaveBeenCalled();
        expect(slackNotifyTestimonialReminderSent).not.toHaveBeenCalled();
    });
});
