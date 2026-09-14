import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestCancel } from './adminBookingRequestCancel';

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

async function setupCancelableRequest() {
    const admin = await commandSetup.withUser({ firstName: 'cancel-admin', lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });

    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cancel' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
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
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });

    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cook.user.userId,
        cookAccepted: true,
        userAccepted: null,
        menuPriceCents: 25_000,
        travelExpensesCents: 2_000,
        paymentProviderFeeCents: 0,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 4,
        platformFeeCentsCook: 0,
        platformFeeCentsCustomer: 0,
        payoutCentsCook: 0,
        totalWithoutDiscountsCentsCustomer: 27_000,
        paymentStatus: 'EMPTY',
    });

    return { admin, cook, customer, bookingRequestId, bookingRequestOfferId };
}

describe('adminBookingRequestCancel', () => {
    it('cancels a waiting request, declines offers, and writes USER_CANCELLED events', async () => {
        const { admin, bookingRequestId, bookingRequestOfferId } = await setupCancelableRequest();

        const result = await adminBookingRequestCancel(
            adminMutationParent(admin.user.userId),
            { bookingRequestId, reason: 'Ops cancel' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.canceledAt).not.toBeNull();
        expect(row?.cancellationReason).toBe('Ops cancel');

        const [offerRow] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offerRow?.userAccepted).toBe(false);

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(
                and(
                    eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId),
                    eq(bookingRequestOfferEvents.type, 'USER_CANCELLED'),
                ),
            );
        expect(events).toHaveLength(1);
    });

    it('rejects cancel after dual-accept payment path', async () => {
        const { admin, bookingRequestId, bookingRequestOfferId } = await setupCancelableRequest();
        await testDb
            .update(bookingRequestOffers)
            .set({ userAccepted: true, cookAccepted: true, paymentStatus: 'PAYED' })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        await expect(
            adminBookingRequestCancel(
                adminMutationParent(admin.user.userId),
                { bookingRequestId, reason: 'Too late' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/not cancelable/);
    });
});
