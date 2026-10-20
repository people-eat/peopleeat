import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferPayoutAlreadyTookPlaceCheck } from './adminBookingRequestOfferPayoutAlreadyTookPlaceCheck';
import { adminBookingRequestOfferPayoutMarkOutOfSystem } from './adminBookingRequestOfferPayoutMarkOutOfSystem';
import { adminBookingRequestOfferPayoutRelease } from './adminBookingRequestOfferPayoutRelease';

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

async function setupAdmin() {
    const admin = await commandSetup.withUser({ firstName: 'payout-admin', lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });
    return admin;
}

async function insertDuePayedOffer(options?: {
    stripeAccountId?: string | null;
    stripeAccountActive?: boolean;
    paymentStatus?: 'PAYED' | 'TRANSFERRED' | 'PAYED_OUT_OF_SYSTEM' | 'EMPTY';
    plannedPayoutDateTime?: Date | null;
    payoutDateTime?: Date | null;
}) {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Payout' });
    await testDb.insert(cooks).values({
        cookId: cookSetup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: options?.stripeAccountId === undefined ? 'acct_test_payout' : options.stripeAccountId,
        stripeAccountActive: options?.stripeAccountActive ?? true,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
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
        paymentStatus: options?.paymentStatus ?? 'PAYED',
        paymentDateTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        plannedPayoutDateTime:
            options?.plannedPayoutDateTime === undefined ? new Date(Date.now() - 24 * 60 * 60 * 1000) : options.plannedPayoutDateTime,
        payoutDateTime: options?.payoutDateTime ?? null,
    });

    return { cookSetup, bookingRequestOfferId, cookId: cookSetup.user.userId };
}

describe('adminBookingRequestOfferPayoutRelease', () => {
    it('creates a Stripe payout and sets TRANSFERRED + payoutDateTime', async () => {
        const admin = await setupAdmin();
        const { bookingRequestOfferId, cookId } = await insertDuePayedOffer();
        vi.mocked(admin.serverRuntime.stripe.accountPayoutsEnabledCheck).mockResolvedValue(true);
        vi.mocked(admin.serverRuntime.stripe.payoutCreate).mockResolvedValue({ payoutId: 'po_test_1' });

        const result = await adminBookingRequestOfferPayoutRelease(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        expect(admin.serverRuntime.stripe.payoutCreate).toHaveBeenCalledWith({
            destinationAccountId: 'acct_test_payout',
            amount: 18_400,
        });

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.paymentStatus).toBe('TRANSFERRED');
        expect(offer?.payoutDateTime).toBeInstanceOf(Date);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cookId });
    });

    it('is idempotent when payoutDateTime is already set', async () => {
        const admin = await setupAdmin();
        const payoutDateTime = new Date('2024-01-15T12:00:00.000Z');
        const { bookingRequestOfferId } = await insertDuePayedOffer({
            paymentStatus: 'TRANSFERRED',
            payoutDateTime,
        });

        const result = await adminBookingRequestOfferPayoutRelease(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(admin.serverRuntime.stripe.payoutCreate).not.toHaveBeenCalled();
    });

    it('rejects when cook Stripe account is missing', async () => {
        const admin = await setupAdmin();
        const { bookingRequestOfferId } = await insertDuePayedOffer({ stripeAccountId: null });

        await expect(
            adminBookingRequestOfferPayoutRelease(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/cook is not ready for payout/);

        expect(admin.serverRuntime.stripe.payoutCreate).not.toHaveBeenCalled();
    });

    it('rejects when plannedPayoutDateTime is still in the future', async () => {
        const admin = await setupAdmin();
        const { bookingRequestOfferId } = await insertDuePayedOffer({
            plannedPayoutDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        await expect(
            adminBookingRequestOfferPayoutRelease(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/plannedPayoutDateTime is still in the future/);
    });
});

describe('adminBookingRequestOfferPayoutMarkOutOfSystem', () => {
    it('sets PAYED_OUT_OF_SYSTEM + payoutDateTime without Stripe', async () => {
        const admin = await setupAdmin();
        const { bookingRequestOfferId } = await insertDuePayedOffer({ stripeAccountId: null });

        const result = await adminBookingRequestOfferPayoutMarkOutOfSystem(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.paymentStatus).toBe('PAYED_OUT_OF_SYSTEM');
        expect(offer?.payoutDateTime).toBeInstanceOf(Date);
        expect(admin.serverRuntime.stripe.payoutCreate).not.toHaveBeenCalled();
    });
});

describe('adminBookingRequestOfferPayoutAlreadyTookPlaceCheck', () => {
    it('sets TRANSFERRED without creating a payout when Stripe shows a matching payout', async () => {
        const admin = await setupAdmin();
        const { bookingRequestOfferId, cookId } = await insertDuePayedOffer();
        vi.mocked(admin.serverRuntime.stripe.accountPayoutsFindMany).mockResolvedValue([
            {
                id: 'po_manual_1',
                amountCents: 18_400,
                status: 'PAID',
                createdAt: new Date(),
                arrivalDate: new Date(),
            },
        ]);

        const result = await adminBookingRequestOfferPayoutAlreadyTookPlaceCheck(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        expect(admin.serverRuntime.stripe.payoutCreate).not.toHaveBeenCalled();
        expect(admin.serverRuntime.stripe.accountPayoutsFindMany).toHaveBeenCalledWith({
            accountId: 'acct_test_payout',
            limit: 100,
        });

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.paymentStatus).toBe('TRANSFERRED');
        expect(offer?.payoutDateTime).toBeInstanceOf(Date);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cookId });
    });

    it('returns success false and leaves PAYED when Stripe has no matching payout', async () => {
        const admin = await setupAdmin();
        const { bookingRequestOfferId } = await insertDuePayedOffer();
        vi.mocked(admin.serverRuntime.stripe.accountPayoutsFindMany).mockResolvedValue([
            {
                id: 'po_other',
                amountCents: 9_999,
                status: 'PAID',
                createdAt: new Date(),
                arrivalDate: new Date(),
            },
        ]);

        const result = await adminBookingRequestOfferPayoutAlreadyTookPlaceCheck(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: false, referenceId: bookingRequestOfferId });
        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.paymentStatus).toBe('PAYED');
        expect(offer?.payoutDateTime).toBeNull();
        expect(admin.serverRuntime.stripe.payoutCreate).not.toHaveBeenCalled();
    });

    it('rejects when cook has no Stripe account', async () => {
        const admin = await setupAdmin();
        const { bookingRequestOfferId } = await insertDuePayedOffer({ stripeAccountId: null });

        await expect(
            adminBookingRequestOfferPayoutAlreadyTookPlaceCheck(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/cook has no Stripe account/);

        expect(admin.serverRuntime.stripe.accountPayoutsFindMany).not.toHaveBeenCalled();
    });

    it('is idempotent when already transferred', async () => {
        const admin = await setupAdmin();
        const { bookingRequestOfferId } = await insertDuePayedOffer({
            paymentStatus: 'TRANSFERRED',
            payoutDateTime: new Date('2024-01-15T12:00:00.000Z'),
        });

        const result = await adminBookingRequestOfferPayoutAlreadyTookPlaceCheck(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(admin.serverRuntime.stripe.accountPayoutsFindMany).not.toHaveBeenCalled();
    });

    it('upgrades PAYED_OUT_OF_SYSTEM to TRANSFERRED when Stripe shows a matching payout', async () => {
        const admin = await setupAdmin();
        const payoutDateTime = new Date('2024-02-01T10:00:00.000Z');
        const { bookingRequestOfferId } = await insertDuePayedOffer({
            paymentStatus: 'PAYED_OUT_OF_SYSTEM',
            payoutDateTime,
        });
        vi.mocked(admin.serverRuntime.stripe.accountPayoutsFindMany).mockResolvedValue([
            {
                id: 'po_manual_2',
                amountCents: 18_400,
                status: 'IN_TRANSIT',
                createdAt: new Date(),
                arrivalDate: new Date(),
            },
        ]);

        const result = await adminBookingRequestOfferPayoutAlreadyTookPlaceCheck(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.paymentStatus).toBe('TRANSFERRED');
        expect(offer?.payoutDateTime?.toISOString()).toBe(payoutDateTime.toISOString());
        expect(admin.serverRuntime.stripe.payoutCreate).not.toHaveBeenCalled();
    });

    it('keeps PAYED_OUT_OF_SYSTEM when Stripe has no matching payout', async () => {
        const admin = await setupAdmin();
        const { bookingRequestOfferId } = await insertDuePayedOffer({
            paymentStatus: 'PAYED_OUT_OF_SYSTEM',
            payoutDateTime: new Date('2024-02-01T10:00:00.000Z'),
        });
        vi.mocked(admin.serverRuntime.stripe.accountPayoutsFindMany).mockResolvedValue([]);

        const result = await adminBookingRequestOfferPayoutAlreadyTookPlaceCheck(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: false, referenceId: bookingRequestOfferId });
        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.paymentStatus).toBe('PAYED_OUT_OF_SYSTEM');
    });
});
