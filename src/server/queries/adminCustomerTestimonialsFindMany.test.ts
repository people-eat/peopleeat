import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, customerTestimonials } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCustomerTestimonialsFindMany } from './adminCustomerTestimonialsFindMany';

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

describe('adminCustomerTestimonialsFindMany', () => {
    it('scopes customer testimonials to offers by cookIds', async () => {
        // Arrange
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Review' });
        const cookA = await commandSetup.withUser({ firstName: 'Chef', lastName: 'A' });
        const cookB = await commandSetup.withUser({ firstName: 'Chef', lastName: 'B' });
        await testDb.insert(cooks).values([{ cookId: cookA.user.userId }, { cookId: cookB.user.userId }]);
        const bookingRequestId = idCreate();
        const offerA = idCreate();
        const offerB = idCreate();
        const testimonialA = idCreate();
        const testimonialB = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Hello',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        const offerFees = {
            menuPriceCents: 20_000,
            travelExpensesCents: 0,
            paymentProviderFeeCents: 0,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 0,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 0,
            payoutCentsCook: 16_400,
            totalWithoutDiscountsCentsCustomer: 20_000,
            paymentStatus: 'EMPTY' as const,
        };
        await testDb.insert(bookingRequestOffers).values([
            {
                bookingRequestOfferId: offerA,
                bookingRequestId,
                cookId: cookA.user.userId,
                ...offerFees,
            },
            {
                bookingRequestOfferId: offerB,
                bookingRequestId,
                cookId: cookB.user.userId,
                ...offerFees,
            },
        ]);
        await testDb.insert(customerTestimonials).values([
            {
                customerTestimonialId: testimonialA,
                userId: customer.user.userId,
                bookingRequestOfferId: offerA,
                body: 'Great A',
                publicationStatus: 'PUBLISHED',
                publishedAt: new Date(),
            },
            {
                customerTestimonialId: testimonialB,
                userId: customer.user.userId,
                bookingRequestOfferId: offerB,
                body: 'Great B',
                publicationStatus: 'PENDING_REVIEW',
            },
        ]);

        // Act
        const rows = await adminCustomerTestimonialsFindMany(customer.requestingSession, customer.serverRuntime, {
            skip: 0,
            take: 100,
            cookIds: [cookA.user.userId],
        });

        // Assert
        expect(rows.map((row) => row.customerTestimonialId)).toEqual([testimonialA]);
    });
});
