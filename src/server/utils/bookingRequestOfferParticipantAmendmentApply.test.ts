import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cookBookingRequestOfferParticipantAmendmentAccept } from '../commands/cookBookingRequestOfferParticipantAmendmentAccept';
import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks } from '../db/schema';
import type { BookingRequestOfferParticipantAmendment } from '../domain/bookingRequest';
import { commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';

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

async function seedOfferWithPendingAmendment(paymentStatus: 'EMPTY' | 'SETUP' | 'PAYED') {
    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
    const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Customer' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_apply',
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

    await testDb.insert(bookingRequestParticipants).values(
        [1, 2, 3, 4].map((n) => ({
            bookingRequestParticipantId: idCreate(),
            bookingRequestId,
            type: 'ADULT' as const,
            name: `Adult ${n}`,
            restrictions: [],
        })),
    );

    const amendment: BookingRequestOfferParticipantAmendment = {
        amendmentApplyId: idCreate(),
        requestedAt: new Date().toISOString(),
        participants: [
            { type: 'ADULT', name: 'A', restrictions: [] },
            { type: 'ADULT', name: 'B', restrictions: [] },
        ],
        menuPriceCentsBefore: 40_000,
        travelExpensesCentsBefore: 2_000,
        totalCentsCustomerBefore: 45_000,
        payoutCentsCookBefore: 34_800,
    };

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
                ? { setupIntentId: 'seti_apply', clientSecret: 'seti_secret' }
                : paymentStatus === 'EMPTY'
                  ? { paymentIntentId: 'pi_open', clientSecret: 'pi_open_secret' }
                  : {
                        paymentIntentId: 'pi_apply',
                        clientSecret: 'pi_secret',
                        transferId: 'tr_apply',
                        amendmentPaymentIntentIds: ['pi_amend_prior'],
                    },
        participantAmendment: amendment,
        plannedPayoutDateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return { cook, customer, bookingRequestId, bookingRequestOfferId };
}

describe('bookingRequestOfferParticipantAmendmentApply', () => {
    it('EMPTY cancels open PI and re-prepares payment', async () => {
        const { cook, bookingRequestOfferId } = await seedOfferWithPendingAmendment('EMPTY');
        vi.mocked(cook.serverRuntime.stripe.paymentIntentCancel).mockResolvedValue(undefined);
        vi.mocked(cook.serverRuntime.stripe.setupIntentCreate).mockResolvedValue({
            setupIntentId: 'seti_new',
            clientSecret: 'seti_new_secret',
        });

        const accepted = await cookBookingRequestOfferParticipantAmendmentAccept(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(accepted.success).toBe(true);
        expect(cook.serverRuntime.stripe.paymentIntentCancel).toHaveBeenCalledWith('pi_open');

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.participantAmendment).toBeNull();
        expect(offer?.menuPriceCents).toBe(20_000);
        expect(offer?.plannedPayoutDateTime).toBeTruthy();
    });

    it('PAYED decrease refunds from newest amendment PaymentIntent first', async () => {
        const { cook, bookingRequestOfferId } = await seedOfferWithPendingAmendment('PAYED');
        vi.mocked(cook.serverRuntime.stripe.paymentIntentRefundableCentsFindOne).mockImplementation(async (id) =>
            id === 'pi_amend_prior' ? 50_000 : 100_000,
        );
        vi.mocked(cook.serverRuntime.stripe.paymentIntentRefund).mockResolvedValue({ refundId: 're_newest' });
        vi.mocked(cook.serverRuntime.stripe.transferReverse).mockResolvedValue(undefined);

        const accepted = await cookBookingRequestOfferParticipantAmendmentAccept(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(accepted.success).toBe(true);
        expect(cook.serverRuntime.stripe.paymentIntentRefund).toHaveBeenCalled();
        const refundCall = vi.mocked(cook.serverRuntime.stripe.paymentIntentRefund).mock.calls[0];
        expect(refundCall?.[0]).toBe('pi_amend_prior');
    });

    it('PAYED increase without PM creates on-session pending delta payment', async () => {
        const { cook, bookingRequestId, bookingRequestOfferId } = await seedOfferWithPendingAmendment('PAYED');
        await testDb.delete(bookingRequestParticipants).where(eq(bookingRequestParticipants.bookingRequestId, bookingRequestId));
        await testDb.insert(bookingRequestParticipants).values(
            [1, 2].map((n) => ({
                bookingRequestParticipantId: idCreate(),
                bookingRequestId,
                type: 'ADULT' as const,
                name: `Adult ${n}`,
                restrictions: [],
            })),
        );
        const increaseAmendment: BookingRequestOfferParticipantAmendment = {
            amendmentApplyId: idCreate(),
            requestedAt: new Date().toISOString(),
            participants: [1, 2, 3, 4].map((n) => ({ type: 'ADULT', name: `A${n}`, restrictions: [] })),
            menuPriceCentsBefore: 20_000,
            travelExpensesCentsBefore: 2_000,
            totalCentsCustomerBefore: 23_000,
            payoutCentsCookBefore: 17_400,
        };
        await testDb
            .update(bookingRequestOffers)
            .set({
                menuPriceCents: 20_000,
                totalWithoutDiscountsCentsCustomer: 23_000,
                totalCentsCustomer: 23_000,
                payoutCentsCook: 17_400,
                paymentData: { paymentIntentId: 'pi_apply', clientSecret: 'pi_secret', transferId: 'tr_apply' },
                participantAmendment: increaseAmendment,
            })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        vi.mocked(cook.serverRuntime.stripe.paymentIntentPaymentMethodIdFindOne).mockResolvedValue(undefined);
        vi.mocked(cook.serverRuntime.stripe.paymentIntentCreateWithSplit).mockResolvedValue({
            paymentIntentId: 'pi_delta',
            clientSecret: 'pi_delta_secret',
        });

        const accepted = await cookBookingRequestOfferParticipantAmendmentAccept(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(accepted.success).toBe(true);
        expect(cook.serverRuntime.stripe.paymentIntentCreateWithSplit).toHaveBeenCalled();

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(
            offer?.paymentData && 'pendingDeltaPayment' in offer.paymentData
                ? offer.paymentData.pendingDeltaPayment?.paymentIntentId
                : null,
        ).toBe('pi_delta');
    });
});
