import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import {
    bookingRequestOfferPaymentConfirmedEmailSend,
    bookingRequestOfferPullPaymentAnnouncementEmailSend,
    userBookingRequestCancelEmailSend,
    userBookingRequestOfferAcceptEmailSend,
} from './bookingRequestLifecycleEmails';

async function bookingSetup() {
    const { serverRuntime, user: customer } = await commandSetup.withUser({ phoneNumber: phoneNumberCreate() });
    const { user: cook } = await commandSetup.withUser({ phoneNumber: phoneNumberCreate() });
    await testDb.insert(cooks).values({ cookId: cook.userId });
    const [request] = await testDb
        .insert(bookingRequests)
        .values({
            bookingRequestId: idCreate(),
            userId: customer.userId,
            occasion: 'Dinner',
            dateTime: new Date('2027-06-12T18:00:00Z'),
            exactEventAddress: {
                displayText: 'Berlin',
                latitude: 52.52,
                longitude: 13.405,
                addressLine1: 'Street 1',
                addressLine2: '',
                city: 'Berlin',
                postCode: '10115',
                state: 'BE',
                country: 'DE',
            },
            priceClassType: 'MEDIUM',
            preferences: [],
            originalMessage: 'Dinner request',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        })
        .returning();
    const [offer] = await testDb
        .insert(bookingRequestOffers)
        .values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId: request!.bookingRequestId,
            cookId: cook.userId,
            menuPriceCents: 20_000,
            travelExpensesCents: 0,
            paymentProviderFeeCents: 0,
            platformFeePercentCook: 0,
            platformFeePercentCustomer: 0,
            platformFeeCentsCook: 0,
            platformFeeCentsCustomer: 0,
            payoutCentsCook: 20_000,
            totalWithoutDiscountsCentsCustomer: 20_000,
            totalCentsCustomer: 20_000,
            paymentStatus: 'SETUP',
        })
        .returning();
    return { serverRuntime, customer, cook, request: request!, offer: offer! };
}

describe('booking lifecycle notification channels', () => {
    it('emails a cancellation to both parties without attempting WhatsApp', async () => {
        // Arrange
        const { serverRuntime, customer, cook, request } = await bookingSetup();
        // Act
        await userBookingRequestCancelEmailSend(serverRuntime, {
            bookingRequestId: request.bookingRequestId,
            customerUserId: customer.userId,
            cookIds: [cook.userId],
            reason: 'Plans changed',
        });
        // Assert
        expect(serverRuntime.email.send).toHaveBeenCalledTimes(2);
        for (const userId of [customer.userId, cook.userId]) {
            expect(serverRuntime.email.send).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'BOOKING_REQUEST_CANCELED', userId }));
        }
        expect(serverRuntime.whatsapp.sendTemplate).not.toHaveBeenCalled();
    });

    it('keeps payment confirmation email-only and retains the calendar attachment', async () => {
        // Arrange
        const { serverRuntime, customer, request, offer } = await bookingSetup();
        // Act
        await bookingRequestOfferPaymentConfirmedEmailSend(serverRuntime, { bookingRequest: request, offer });
        // Assert
        expect(serverRuntime.email.send).toHaveBeenCalledTimes(1);
        expect(serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                purpose: 'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED',
                userId: customer.userId,
                attachments: [expect.objectContaining({ filename: 'peopleeat-event.ics' })],
            }),
        );
        expect(serverRuntime.whatsapp.sendTemplate).not.toHaveBeenCalled();
    });

    it('emails the pull-payment announcement without attempting WhatsApp', async () => {
        // Arrange
        const { serverRuntime, customer, request, offer } = await bookingSetup();
        // Act
        await bookingRequestOfferPullPaymentAnnouncementEmailSend(serverRuntime, {
            bookingRequestId: request.bookingRequestId,
            bookingRequestOfferId: offer.bookingRequestOfferId,
            customerUserId: customer.userId,
            totalCentsCustomer: 20_000,
            pullPaymentDate: new Date('2027-06-05T12:00:00Z'),
        });
        // Assert
        expect(serverRuntime.email.send).toHaveBeenCalledTimes(1);
        expect(serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                purpose: 'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT',
                userId: customer.userId,
            }),
        );
        expect(serverRuntime.whatsapp.sendTemplate).not.toHaveBeenCalled();
    });

    it('preserves the chosen cook acceptance notice without a customer WhatsApp attempt', async () => {
        // Arrange
        const { serverRuntime, customer, cook, request, offer } = await bookingSetup();
        // Act
        await userBookingRequestOfferAcceptEmailSend(serverRuntime, {
            bookingRequestId: request.bookingRequestId,
            bookingRequestOfferId: offer.bookingRequestOfferId,
            customerUserId: customer.userId,
            cookId: cook.userId,
            siblingCookIds: [],
        });
        // Assert
        expect(serverRuntime.email.send).toHaveBeenCalledTimes(1);
        expect(serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({ purpose: 'BOOKING_REQUEST_OFFER_ACCEPTED', userId: cook.userId }),
        );
        expect(serverRuntime.whatsapp.sendTemplate).toHaveBeenCalledTimes(1);
        expect(serverRuntime.whatsapp.sendTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                purpose: 'BOOKING_REQUEST_OFFER_ACCEPTED_COOK',
                userId: cook.userId,
                relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: offer.bookingRequestOfferId },
            }),
        );
    });
});
