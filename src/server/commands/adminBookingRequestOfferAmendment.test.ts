import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOfferEvents, bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferAmendmentApply } from './adminBookingRequestOfferAmendmentApply';
import { adminBookingRequestOfferAmendmentCreate } from './adminBookingRequestOfferAmendmentCreate';
import { cookBookingRequestOfferParticipantAmendmentAccept } from './cookBookingRequestOfferParticipantAmendmentAccept';

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

async function seedDualAcceptedOffer(paymentStatus: 'EMPTY' | 'SETUP' | 'PAYED' = 'EMPTY') {
    const admin = await commandSetup.withUser({ firstName: 'amend-admin', lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });

    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Amend' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_admin_amend',
        stripeAccountActive: true,
    });

    const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Customer' });
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
        [1, 2].map((n) => ({
            bookingRequestParticipantId: idCreate(),
            bookingRequestId,
            type: 'ADULT' as const,
            name: `Adult ${n}`,
            restrictions: [],
        })),
    );

    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cook.user.userId,
        cookAccepted: true,
        userAccepted: true,
        menuPriceCents: 40_000,
        travelExpensesCents: 2_000,
        paymentProviderFeeCents: 800,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 4,
        platformFeeCentsCook: 7_200,
        platformFeeCentsCustomer: 1_600,
        payoutCentsCook: 34_800,
        totalWithoutDiscountsCentsCustomer: 45_000,
        totalCentsCustomer: 45_000,
        giftCardAppliedCents: 0,
        paymentStatus,
        paymentData:
            paymentStatus === 'SETUP'
                ? { setupIntentId: 'seti_admin', clientSecret: 'seti_secret' }
                : paymentStatus === 'EMPTY'
                  ? { paymentIntentId: 'pi_admin_open', clientSecret: 'pi_secret' }
                  : { paymentIntentId: 'pi_admin_paid', clientSecret: 'pi_secret', transferId: 'tr_admin' },
        plannedPayoutDateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return { admin, cook, customer, bookingRequestId, bookingRequestOfferId };
}

describe('adminBookingRequestOfferAmendmentCreate', () => {
    it('proposes absolute menu/travel without feature toggle and without Stripe calls', async () => {
        const { admin, bookingRequestOfferId } = await seedDualAcceptedOffer('EMPTY');

        const result = await adminBookingRequestOfferAmendmentCreate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestOfferId,
                input: { menuPriceCents: 55_000, travelExpensesCents: 3_000 },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        expect(admin.serverRuntime.stripe.paymentIntentCancel).not.toHaveBeenCalled();

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.participantAmendment?.menuPriceCentsAfter).toBe(55_000);
        expect(offer?.participantAmendment?.travelExpensesCentsAfter).toBe(3_000);
        expect(offer?.menuPriceCents).toBe(40_000);

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId));
        expect(events.some((event) => event.type === 'ADMIN_PARTICIPANT_AMENDMENT_REQUESTED')).toBe(true);
    });

    it('rejects when preparations are locked', async () => {
        const { admin, bookingRequestOfferId } = await seedDualAcceptedOffer('SETUP');
        await testDb
            .update(bookingRequestOffers)
            .set({ preparationsCompletedAt: new Date() })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        await expect(
            adminBookingRequestOfferAmendmentCreate(
                adminMutationParent(admin.user.userId),
                {
                    bookingRequestOfferId,
                    input: { menuPriceCents: 50_000 },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/amendment is not allowed/);
    });
});

describe('adminBookingRequestOfferAmendmentApply', () => {
    it('EMPTY cancel and re-prepare applies menu override immediately', async () => {
        const { admin, bookingRequestOfferId } = await seedDualAcceptedOffer('EMPTY');
        vi.mocked(admin.serverRuntime.stripe.paymentIntentCancel).mockResolvedValue(undefined);
        vi.mocked(admin.serverRuntime.stripe.setupIntentCreate).mockResolvedValue({
            setupIntentId: 'seti_fresh',
            clientSecret: 'seti_fresh_secret',
        });

        const result = await adminBookingRequestOfferAmendmentApply(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestOfferId,
                input: { menuPriceCents: 50_000 },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(admin.serverRuntime.stripe.paymentIntentCancel).toHaveBeenCalledWith('pi_admin_open');

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.menuPriceCents).toBe(50_000);
        expect(offer?.participantAmendment).toBeNull();

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId));
        expect(events.some((event) => event.type === 'ADMIN_PARTICIPANT_AMENDMENT_APPLIED')).toBe(true);
    });

    it('SETUP updates columns only', async () => {
        const { admin, bookingRequestOfferId } = await seedDualAcceptedOffer('SETUP');

        await adminBookingRequestOfferAmendmentApply(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestOfferId,
                input: { menuPriceCents: 48_000, travelExpensesCents: 1_500 },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(admin.serverRuntime.stripe.paymentIntentCancel).not.toHaveBeenCalled();
        expect(admin.serverRuntime.stripe.setupIntentCancel).not.toHaveBeenCalled();

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.menuPriceCents).toBe(48_000);
        expect(offer?.travelExpensesCents).toBe(1_500);
        expect(offer?.paymentStatus).toBe('SETUP');
    });

    it('PAYED decrease refunds customer delta', async () => {
        const { admin, bookingRequestOfferId } = await seedDualAcceptedOffer('PAYED');
        vi.mocked(admin.serverRuntime.stripe.paymentIntentRefundableCentsFindOne).mockResolvedValue(100_000);
        vi.mocked(admin.serverRuntime.stripe.paymentIntentRefund).mockResolvedValue({ refundId: 're_admin' });
        vi.mocked(admin.serverRuntime.stripe.transferReversibleCentsFindOne).mockResolvedValue(100_000);
        vi.mocked(admin.serverRuntime.stripe.transferReverse).mockResolvedValue(undefined);
        vi.mocked(admin.serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne).mockResolvedValue(undefined);

        await adminBookingRequestOfferAmendmentApply(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestOfferId,
                input: { menuPriceCents: 20_000 },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(admin.serverRuntime.stripe.paymentIntentRefund).toHaveBeenCalled();
        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.menuPriceCents).toBe(20_000);
    });
});

describe('cook accept of admin price-override amendment', () => {
    it('applies absolute menu override from pending admin proposal', async () => {
        const { admin, cook, bookingRequestOfferId } = await seedDualAcceptedOffer('SETUP');

        await adminBookingRequestOfferAmendmentCreate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestOfferId,
                input: { menuPriceCents: 60_000 },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const accepted = await cookBookingRequestOfferParticipantAmendmentAccept(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(accepted.success).toBe(true);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.menuPriceCents).toBe(60_000);
        expect(offer?.participantAmendment).toBeNull();
    });
});
