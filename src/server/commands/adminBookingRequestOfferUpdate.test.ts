import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferUpdate } from './adminBookingRequestOfferUpdate';

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

async function setupAdminOfferUpdate() {
    const admin = await commandSetup.withUser({ firstName: 'offer-update-admin', lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });

    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'UpdateOffer' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'UpdateHost' });
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
        menuPriceCents: 20_000,
        travelExpensesCents: 1_000,
        paymentProviderFeeCents: 400,
        platformFeePercentCook: 15,
        platformFeePercentCustomer: 10,
        platformFeeCentsCook: 3_000,
        platformFeeCentsCustomer: 2_140,
        payoutCentsCook: 18_000,
        totalWithoutDiscountsCentsCustomer: 23_540,
        paymentStatus: 'EMPTY',
    });

    return { admin, cook, customer, bookingRequestId, bookingRequestOfferId };
}

describe('adminBookingRequestOfferUpdate', () => {
    it('recalculates fees from menu and travel inputs', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminOfferUpdate();
        const expectedPrice = bookingRequestOfferPriceCalculate({
            menuPriceCents: 30_000,
            travelExpensesCents: 3_000,
        });

        const result = await adminBookingRequestOfferUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestOfferId,
                input: {
                    menuPriceCents: 30_000,
                    travelExpensesCents: 3_000,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.menuPriceCents).toBe(expectedPrice.menuPriceCents);
        expect(offer?.travelExpensesCents).toBe(expectedPrice.travelExpensesCents);
        expect(offer?.platformFeePercentCook).toBe(18);
        expect(offer?.payoutCentsCook).toBe(expectedPrice.payoutCentsCook);
        expect(offer?.totalWithoutDiscountsCentsCustomer).toBe(expectedPrice.totalWithoutDiscountsCentsCustomer);
        expect(offer?.paymentStatus).toBe('EMPTY');
    });

    it('sets PAYED_OUT_OF_SYSTEM when dual-accepting an EMPTY offer', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminOfferUpdate();

        await adminBookingRequestOfferUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestOfferId,
                input: { userAccepted: true, cookAccepted: true },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.userAccepted).toBe(true);
        expect(offer?.cookAccepted).toBe(true);
        expect(offer?.paymentStatus).toBe('PAYED_OUT_OF_SYSTEM');
    });

    it('no-ops when input is empty', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminOfferUpdate();

        const result = await adminBookingRequestOfferUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId, input: {} },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects unknown offers', async () => {
        const { admin } = await setupAdminOfferUpdate();

        await expect(
            adminBookingRequestOfferUpdate(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferId: idCreate(), input: { menuPriceCents: 1 } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/offer not found/);
    });
});
