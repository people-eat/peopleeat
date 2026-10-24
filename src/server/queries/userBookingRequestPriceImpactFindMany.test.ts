import { describe, expect, it } from 'vitest';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userBookingRequestPriceImpactFindMany } from './userBookingRequestPriceImpactFindMany';

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

describe('userBookingRequestPriceImpactFindMany', () => {
    it('previews dual-accepted customer totals with menu scale by paid headcount', async () => {
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Customer' });
        await testDb.insert(cooks).values({
            cookId: cook.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: berlin,
            travelExpensesAmount: 25,
            maximumTravelDistance: 100,
        });

        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Birthday',
            dateTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Looking for a chef',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        await testDb.insert(bookingRequestParticipants).values(
            [1, 2, 3, 4].map((n) => ({
                bookingRequestParticipantId: idCreate(),
                bookingRequestId,
                type: 'ADULT' as const,
                name: `Adult ${n}`,
                restrictions: [],
            })),
        );

        const price = bookingRequestOfferPriceCalculate({
            menuPriceCents: 40_000,
            travelExpensesCents: 2_000,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 4,
        });
        const bookingRequestOfferId = idCreate();
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId,
            bookingRequestId,
            cookId: cook.user.userId,
            cookAccepted: true,
            userAccepted: true,
            menuPriceCents: price.menuPriceCents,
            travelExpensesCents: price.travelExpensesCents,
            paymentProviderFeeCents: price.paymentProviderFeeCents,
            platformFeePercentCook: price.platformFeePercentCook,
            platformFeePercentCustomer: price.platformFeePercentCustomer,
            platformFeeCentsCook: price.platformFeeCentsCook,
            platformFeeCentsCustomer: price.platformFeeCentsCustomer,
            payoutCentsCook: price.payoutCentsCook,
            totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
            totalCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
            giftCardAppliedCents: 0,
            paymentStatus: 'PAYED',
        });

        const impacts = await userBookingRequestPriceImpactFindMany(
            { bookingRequestId },
            { participantsAdult: 2, participantsDiscounted: 0 },
            customer.serverRuntime,
        );

        expect(impacts).toHaveLength(1);
        expect(impacts[0]?.bookingRequestOfferId).toBe(bookingRequestOfferId);
        expect(impacts[0]?.menuPriceCentsBefore).toBe(40_000);
        expect(impacts[0]?.menuPriceCentsAfter).toBe(20_000);
        expect(impacts[0]?.totalCentsCustomerAfter).toBeLessThan(impacts[0]?.totalCentsCustomerBefore ?? 0);
        expect(impacts[0]?.payoutCentsCookAfter).toBeLessThan(impacts[0]?.payoutCentsCookBefore ?? 0);
    });
});
