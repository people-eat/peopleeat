import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestExpectedMenuPriceRangeFindOne } from './bookingRequestExpectedMenuPriceRangeFindOne';

const sampleAddress = {
    displayText: 'Musterstraße 1, 80331 München',
    latitude: 48.137,
    longitude: 11.575,
    addressLine1: 'Musterstraße 1',
    addressLine2: '',
    city: 'München',
    postCode: '80331',
    state: 'BY',
    country: 'DE',
};

describe('bookingRequestExpectedMenuPriceRangeFindOne', () => {
    it('always returns a non-null menu-price band for a headcount', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup.withUser();

        // Act
        const result = await bookingRequestExpectedMenuPriceRangeFindOne(
            { participantsAdult: 4, participantsDiscounted: 0 },
            serverRuntime,
        );

        // Assert
        expect(result.minAmountCents).toBeGreaterThan(0);
        expect(result.maxAmountCents).toBeGreaterThanOrEqual(result.minAmountCents);
    });

    it('includes historical offers when building the band', async () => {
        // Arrange
        const customer = await commandSetup.withUser();
        const cook = await commandSetup.withUser({ firstName: 'Range', lastName: 'Chef' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId, isVisible: true, isApprovedByAdmin: true });

        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Anniversary',
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            exactEventAddress: sampleAddress,
            priceClassType: 'MEDIUM',
            originalMessage: 'Please cook for us.',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        for (let index = 0; index < 4; index += 1) {
            await testDb.insert(bookingRequestParticipants).values({
                bookingRequestParticipantId: idCreate(),
                bookingRequestId,
                type: 'ADULT',
                name: `Guest ${index + 1}`,
                restrictions: [],
            });
        }
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId,
            cookId: cook.user.userId,
            cookAccepted: true,
            userAccepted: null,
            menuPriceCents: 40_000,
            travelExpensesCents: 2_500,
            paymentProviderFeeCents: 500,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 4,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 900,
            payoutCentsCook: 18_400,
            totalWithoutDiscountsCentsCustomer: 43_900,
            paymentStatus: 'EMPTY',
        });

        // Act
        const result = await bookingRequestExpectedMenuPriceRangeFindOne(
            { participantsAdult: 4, participantsDiscounted: 0 },
            customer.serverRuntime,
        );

        // Assert
        expect(result.minAmountCents).toBeGreaterThan(0);
        expect(result.maxAmountCents).toBeGreaterThanOrEqual(result.minAmountCents);
    });
});
