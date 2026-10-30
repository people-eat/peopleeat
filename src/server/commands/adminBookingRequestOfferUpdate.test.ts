import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
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
        stripeAccountId: 'acct_offer_update',
        stripeAccountActive: true,
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
        totalCentsCustomer: 23_540,
        paymentStatus: 'EMPTY',
    });

    return { admin, cook, customer, bookingRequestId, bookingRequestOfferId };
}

describe('adminBookingRequestOfferUpdate', () => {
    it('recalculates fees from menu and travel inputs using sticky stored percents', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminOfferUpdate();
        const expectedPrice = bookingRequestOfferPriceCalculate({
            menuPriceCents: 30_000,
            travelExpensesCents: 3_000,
            platformFeePercentCook: 15,
            platformFeePercentCustomer: 10,
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
        expect(offer?.platformFeePercentCook).toBe(15);
        expect(offer?.platformFeePercentCustomer).toBe(10);
        expect(offer?.payoutCentsCook).toBe(expectedPrice.payoutCentsCook);
        expect(offer?.totalWithoutDiscountsCentsCustomer).toBe(expectedPrice.totalWithoutDiscountsCentsCustomer);
        expect(offer?.totalCentsCustomer).toBe(expectedPrice.totalWithoutDiscountsCentsCustomer);
        expect(offer?.paymentStatus).toBe('EMPTY');

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId));
        expect(events.some((event) => event.type === 'ADMIN_CHANGED_PRICE')).toBe(true);
        expect(events.some((event) => event.type === 'ADMIN_ACCEPTANCE_UPDATED')).toBe(false);
    });

    it('applies sticky platform fee percent overrides on recalculation', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminOfferUpdate();
        const expectedPrice = bookingRequestOfferPriceCalculate({
            menuPriceCents: 30_000,
            travelExpensesCents: 3_000,
            platformFeePercentCook: 10,
            platformFeePercentCustomer: 2,
        });

        await adminBookingRequestOfferUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestOfferId,
                input: {
                    menuPriceCents: 30_000,
                    travelExpensesCents: 3_000,
                    platformFeePercentCook: 10,
                    platformFeePercentCustomer: 2,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.platformFeePercentCook).toBe(10);
        expect(offer?.platformFeePercentCustomer).toBe(2);
        expect(offer?.platformFeeCentsCook).toBe(expectedPrice.platformFeeCentsCook);
        expect(offer?.platformFeeCentsCustomer).toBe(expectedPrice.platformFeeCentsCustomer);
        expect(offer?.payoutCentsCook).toBe(expectedPrice.payoutCentsCook);
    });

    it('preserves gift/promo discount cents when recalculating totalCentsCustomer', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminOfferUpdate();
        const discountCents = 5_000;
        await testDb
            .update(bookingRequestOffers)
            .set({ totalCentsCustomer: 23_540 - discountCents })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        const expectedPrice = bookingRequestOfferPriceCalculate({
            menuPriceCents: 30_000,
            travelExpensesCents: 3_000,
            platformFeePercentCook: 15,
            platformFeePercentCustomer: 10,
        });

        await adminBookingRequestOfferUpdate(
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

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.totalWithoutDiscountsCentsCustomer).toBe(expectedPrice.totalWithoutDiscountsCentsCustomer);
        expect(offer?.totalCentsCustomer).toBe(expectedPrice.totalWithoutDiscountsCentsCustomer - discountCents);
    });

    it('leaves totalCentsCustomer null when it was unset', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminOfferUpdate();
        await testDb
            .update(bookingRequestOffers)
            .set({ totalCentsCustomer: null })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        await adminBookingRequestOfferUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestOfferId,
                input: { menuPriceCents: 30_000, travelExpensesCents: 3_000 },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.totalCentsCustomer).toBeNull();
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

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId));
        expect(events.some((event) => event.type === 'ADMIN_ACCEPTANCE_UPDATED')).toBe(true);
        expect(events.some((event) => event.type === 'ADMIN_PAYMENT_SCHEDULE_UPDATED')).toBe(true);
        expect(events.some((event) => event.type === 'ADMIN_PAYED_OUT_OF_SYSTEM')).toBe(true);
        expect(events.some((event) => event.type === 'ADMIN_CHANGED_PRICE')).toBe(false);
    });

    it('emits ADMIN_PAYMENT_SCHEDULE_UPDATED when payout timestamps change', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminOfferUpdate();
        const plannedPayoutDateTime = new Date('2030-07-01T12:00:00.000Z');

        await adminBookingRequestOfferUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestOfferId,
                input: { plannedPayoutDateTime },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId));
        const scheduleEvent = events.find((event) => event.type === 'ADMIN_PAYMENT_SCHEDULE_UPDATED');
        expect(scheduleEvent?.payload).toMatchObject({
            plannedPayoutDateTimeBefore: null,
            plannedPayoutDateTimeAfter: plannedPayoutDateTime.toISOString(),
            paymentStatusBefore: 'EMPTY',
            paymentStatusAfter: 'EMPTY',
        });
    });

    it('does not mark already dual-accepted EMPTY as PAYED_OUT_OF_SYSTEM on non-price updates', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminOfferUpdate();
        await testDb
            .update(bookingRequestOffers)
            .set({
                userAccepted: true,
                cookAccepted: true,
                paymentStatus: 'EMPTY',
                paymentData: { setupIntentId: 'seti_keep', clientSecret: 'secret_keep' },
            })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        await adminBookingRequestOfferUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestOfferId,
                input: { travelDistanceKm: 12.5 },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.travelDistanceKm).toBe(12.5);
        expect(offer?.paymentStatus).toBe('EMPTY');
        expect(offer?.paymentData).toEqual({ setupIntentId: 'seti_keep', clientSecret: 'secret_keep' });
    });

    it('rejects menu/travel price changes on dual-accepted offers', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminOfferUpdate();
        await testDb
            .update(bookingRequestOffers)
            .set({
                userAccepted: true,
                cookAccepted: true,
                paymentStatus: 'EMPTY',
                paymentData: { paymentIntentId: 'pi_open', clientSecret: 'secret_open' },
            })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        await expect(
            adminBookingRequestOfferUpdate(
                adminMutationParent(admin.user.userId),
                {
                    bookingRequestOfferId,
                    input: { menuPriceCents: 30_000 },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/bookingRequestOfferAmendmentCreate/);
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
