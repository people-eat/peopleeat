import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeatureToggleKey } from '../../shared/featureToggle';
import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks, featureToggles } from '../db/schema';
import { commandSetup, cookMutationParent, testDb, userMutationParent } from '../test/commandTestUtils';
import { cookBookingRequestOfferParticipantAmendmentAccept } from './cookBookingRequestOfferParticipantAmendmentAccept';
import { cookBookingRequestOfferPreparationsComplete } from './cookBookingRequestOfferPreparationsComplete';
import { userBookingRequestOfferParticipantAmendmentCreate } from './userBookingRequestOfferParticipantAmendmentCreate';

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

async function setFeatureToggle(featureToggleKey: FeatureToggleKey, enabled: boolean) {
    await testDb.insert(featureToggles).values({ featureToggleKey, enabled }).onConflictDoUpdate({
        target: featureToggles.featureToggleKey,
        set: { enabled },
    });
}

async function seedDualAcceptedOffer(paymentStatus: 'SETUP' | 'PAYED' = 'SETUP') {
    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
    const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Customer' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_amend',
        stripeAccountActive: true,
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

    await testDb.insert(bookingRequestParticipants).values([
        {
            bookingRequestParticipantId: idCreate(),
            bookingRequestId,
            type: 'ADULT',
            name: 'Adult 1',
            restrictions: [],
        },
        {
            bookingRequestParticipantId: idCreate(),
            bookingRequestId,
            type: 'ADULT',
            name: 'Adult 2',
            restrictions: [],
        },
        {
            bookingRequestParticipantId: idCreate(),
            bookingRequestId,
            type: 'ADULT',
            name: 'Adult 3',
            restrictions: [],
        },
        {
            bookingRequestParticipantId: idCreate(),
            bookingRequestId,
            type: 'ADULT',
            name: 'Adult 4',
            restrictions: [],
        },
    ]);

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
        paymentStatus,
        paymentData:
            paymentStatus === 'SETUP'
                ? { setupIntentId: 'seti_amend', clientSecret: 'seti_secret' }
                : { paymentIntentId: 'pi_amend', clientSecret: 'pi_secret', transferId: 'tr_amend' },
    });

    return { cook, customer, bookingRequestId, bookingRequestOfferId };
}

describe('userBookingRequestOfferParticipantAmendmentCreate', () => {
    beforeEach(async () => {
        await setFeatureToggle('BOOKING_REQUEST_OFFER_AMENDMENT', true);
        await setFeatureToggle('BOOKING_REQUEST_OFFER_PREPARATIONS_COMPLETE', true);
    });

    it('rejects when the feature toggle is off', async () => {
        await setFeatureToggle('BOOKING_REQUEST_OFFER_AMENDMENT', false);
        const { customer, bookingRequestOfferId } = await seedDualAcceptedOffer();
        const result = await userBookingRequestOfferParticipantAmendmentCreate(
            userMutationParent(customer.user.userId),
            {
                bookingRequestOfferId,
                participants: [
                    { type: 'ADULT', name: 'A', restrictions: [] },
                    { type: 'ADULT', name: 'B', restrictions: [] },
                ],
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(result.success).toBe(false);
    });

    it('stores a pending amendment and cook accept on SETUP only updates price columns', async () => {
        const { cook, customer, bookingRequestId, bookingRequestOfferId } = await seedDualAcceptedOffer('SETUP');

        const created = await userBookingRequestOfferParticipantAmendmentCreate(
            userMutationParent(customer.user.userId),
            {
                bookingRequestOfferId,
                participants: [
                    { type: 'ADULT', name: 'A', restrictions: [] },
                    { type: 'ADULT', name: 'B', restrictions: [] },
                ],
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(created.success).toBe(true);

        const [pending] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(pending?.participantAmendment?.participants).toHaveLength(2);
        expect(pending?.participantAmendment?.amendmentApplyId).toBeTruthy();
        expect(pending?.participantAmendment?.travelExpensesCentsBefore).toBe(2_000);

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
        expect(offer?.participantAmendment).toBeNull();
        expect(offer?.menuPriceCents).toBe(20_000);
        expect(offer?.paymentStatus).toBe('SETUP');
        expect(cook.serverRuntime.stripe.paymentIntentRefund).not.toHaveBeenCalled();

        const participants = await testDb
            .select()
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, bookingRequestId));
        expect(participants).toHaveLength(2);
    });

    it('refunds and reverses Connect transfer when cook accepts a PAYED decrease', async () => {
        const { cook, customer, bookingRequestOfferId } = await seedDualAcceptedOffer('PAYED');
        vi.mocked(cook.serverRuntime.stripe.paymentIntentRefundableCentsFindOne).mockResolvedValue(100_000);
        vi.mocked(cook.serverRuntime.stripe.paymentIntentRefund).mockResolvedValue({ refundId: 're_amend' });
        vi.mocked(cook.serverRuntime.stripe.transferReversibleCentsFindOne).mockResolvedValue(100_000);
        vi.mocked(cook.serverRuntime.stripe.transferReverse).mockResolvedValue(undefined);
        vi.mocked(cook.serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne).mockResolvedValue(undefined);

        await userBookingRequestOfferParticipantAmendmentCreate(
            userMutationParent(customer.user.userId),
            {
                bookingRequestOfferId,
                participants: [
                    { type: 'ADULT', name: 'A', restrictions: [] },
                    { type: 'ADULT', name: 'B', restrictions: [] },
                ],
            },
            customer.requestingSession,
            customer.serverRuntime,
        );

        const accepted = await cookBookingRequestOfferParticipantAmendmentAccept(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(accepted.success).toBe(true);
        expect(cook.serverRuntime.stripe.paymentIntentRefund).toHaveBeenCalled();
        expect(cook.serverRuntime.stripe.transferReverse).toHaveBeenCalled();

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.paymentData && 'refundIds' in offer.paymentData ? offer.paymentData.refundIds : undefined).toEqual(['re_amend']);
    });

    it('blocks create after preparations are completed', async () => {
        const { cook, customer, bookingRequestOfferId } = await seedDualAcceptedOffer();
        const completed = await cookBookingRequestOfferPreparationsComplete(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(completed.success).toBe(true);

        const created = await userBookingRequestOfferParticipantAmendmentCreate(
            userMutationParent(customer.user.userId),
            {
                bookingRequestOfferId,
                participants: [
                    { type: 'ADULT', name: 'A', restrictions: [] },
                    { type: 'ADULT', name: 'B', restrictions: [] },
                ],
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(created.success).toBe(false);
    });

    it('persists venue-recomputed travelExpensesCentsAfter on the pending amendment', async () => {
        const { customer, bookingRequestOfferId } = await seedDualAcceptedOffer('SETUP');
        vi.mocked(customer.serverRuntime.places.drivingDistanceKm).mockResolvedValue(10);

        const nearby = {
            ...berlin,
            displayText: 'Nearby',
            latitude: 52.53,
            longitude: 13.41,
            addressLine1: 'Nearby 1',
        };

        const created = await userBookingRequestOfferParticipantAmendmentCreate(
            userMutationParent(customer.user.userId),
            {
                bookingRequestOfferId,
                exactEventAddress: nearby,
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(created.success).toBe(true);

        const [pending] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        // 10 km × 25 ¢/km × 2 = 500 (was 2_000 on the live offer)
        expect(pending?.participantAmendment?.travelExpensesCentsAfter).toBe(500);
        expect(pending?.participantAmendment?.travelExpensesCentsBefore).toBe(2_000);
        expect(pending?.participantAmendment?.exactEventAddress?.addressLine1).toBe('Nearby 1');
    });
});
