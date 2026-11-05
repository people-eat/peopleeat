import { and, eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { BookingRequestOfferPaymentData } from '../domain/bookingRequest';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestOfferPaymentIntentSucceededApply } from './bookingRequestOfferPaymentIntentSucceededApply';

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

async function seedOffer(paymentData: BookingRequestOfferPaymentData) {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Apply' });
    await testDb.insert(cooks).values({
        cookId: cookSetup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: `acct_${idCreate()}`,
        stripeAccountActive: true,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Apply' });
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
        paymentStatus: 'EMPTY',
        paymentData,
    });

    return { serverRuntime: cookSetup.serverRuntime, bookingRequestOfferId };
}

describe('bookingRequestOfferPaymentIntentSucceededApply', () => {
    it('finalizes PAYED once and ignores a repeat', async () => {
        const paymentIntentId = `pi_${idCreate()}`;
        const { serverRuntime, bookingRequestOfferId } = await seedOffer({
            paymentIntentId,
            clientSecret: 'sec',
        });
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne).mockResolvedValue(`tr_${idCreate()}`);

        const first = await bookingRequestOfferPaymentIntentSucceededApply(paymentIntentId, serverRuntime);
        expect(first).toBe(true);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer!.paymentStatus).toBe('PAYED');
        expect(serverRuntime.email.send).toHaveBeenCalledOnce();

        const eventsAfterFirst = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(
                and(
                    eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId),
                    eq(bookingRequestOfferEvents.type, 'SYSTEM_PAYMENT_SUCCEEDED'),
                ),
            );
        expect(eventsAfterFirst).toHaveLength(1);

        vi.mocked(serverRuntime.email.send).mockClear();
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockClear();

        const second = await bookingRequestOfferPaymentIntentSucceededApply(paymentIntentId, serverRuntime);
        expect(second).toBe(true);
        expect(serverRuntime.email.send).not.toHaveBeenCalled();
        expect(serverRuntime.stripe.paymentIntentSucceededCheck).not.toHaveBeenCalled();

        const eventsAfterSecond = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(
                and(
                    eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId),
                    eq(bookingRequestOfferEvents.type, 'SYSTEM_PAYMENT_SUCCEEDED'),
                ),
            );
        expect(eventsAfterSecond).toHaveLength(1);
    });

    it('returns false when no offer references the PaymentIntent', async () => {
        const { serverRuntime } = await commandSetup.withUser({ firstName: 'a', lastName: 'b' });

        const applied = await bookingRequestOfferPaymentIntentSucceededApply(`pi_${idCreate()}`, serverRuntime);

        expect(applied).toBe(false);
        expect(serverRuntime.email.send).not.toHaveBeenCalled();
    });
});
