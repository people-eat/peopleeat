import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { BookingRequestOfferPaymentData } from '../domain/bookingRequest';
import { slackNotifyPaymentConfirmed, slackNotifyPaymentFinalizeMismatch } from '../slack/slackNotifyBooking';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestOfferPaymentConfirmedEmailSend } from './bookingRequestLifecycleEmails';
import { bookingRequestOfferPaymentFinalize } from './bookingRequestOfferPaymentFinalize';

vi.mock('../slack/slackNotifyBooking', () => ({
    slackNotifyPaymentConfirmed: vi.fn(async () => {}),
    slackNotifyPaymentFinalizeMismatch: vi.fn(async () => {}),
    slackNotifyPaymentFailed: vi.fn(async () => {}),
}));

vi.mock('./bookingRequestLifecycleEmails', () => ({
    bookingRequestOfferPaymentConfirmedEmailSend: vi.fn(async () => {}),
}));

vi.mock('./scheduleTestimonialReminderJobs', () => ({
    scheduleTestimonialReminderJobs: vi.fn(async () => {}),
}));

vi.mock('./bookingRequestOfferEventTomorrowNotifySchedule', () => ({
    bookingRequestOfferEventTomorrowNotifySchedule: vi.fn(async () => {}),
    bookingRequestOfferEventTomorrowNotifyCancel: vi.fn(async () => {}),
}));

vi.mock('./bookingRequestOfferPaymentSessionEventCreate', () => ({
    bookingRequestOfferPaymentSucceededSessionEventCreate: vi.fn(async () => {}),
}));

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

async function seedOffer(options: {
    paymentStatus?: 'EMPTY' | 'SETUP' | 'PAYED' | 'FAILED';
    paymentData: BookingRequestOfferPaymentData;
    totalCentsCustomer?: number;
    payoutCentsCook?: number;
}) {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Finalize' });
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

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Finalize' });
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

    const totalCentsCustomer = options.totalCentsCustomer ?? 23_000;
    const payoutCentsCook = options.payoutCentsCook ?? 18_400;
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
        payoutCentsCook,
        totalWithoutDiscountsCentsCustomer: totalCentsCustomer,
        totalCentsCustomer,
        paymentStatus: options.paymentStatus ?? 'EMPTY',
        paymentData: options.paymentData,
    });

    const [offer] = await testDb
        .select()
        .from(bookingRequestOffers)
        .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
    const [bookingRequest] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));

    const [cook] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookSetup.user.userId));

    return {
        serverRuntime: cookSetup.serverRuntime,
        offer: offer!,
        bookingRequest: bookingRequest!,
        customerUserId: customer.user.userId,
        bookingRequestOfferId,
        bookingRequestId,
        stripeAccountId: cook!.stripeAccountId!,
    };
}

describe('bookingRequestOfferPaymentFinalize', () => {
    beforeEach(() => {
        vi.mocked(slackNotifyPaymentConfirmed).mockClear();
        vi.mocked(slackNotifyPaymentFinalizeMismatch).mockClear();
        vi.mocked(bookingRequestOfferPaymentConfirmedEmailSend).mockClear();
    });

    it('advances to PAYED and notifies once on first call', async () => {
        const paymentIntentId = `pi_${idCreate()}`;
        const seeded = await seedOffer({
            paymentData: { paymentIntentId, clientSecret: 'sec' },
        });
        vi.mocked(seeded.serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(seeded.serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne).mockResolvedValue(`tr_${idCreate()}`);

        const first = await bookingRequestOfferPaymentFinalize(seeded.serverRuntime, {
            offer: seeded.offer,
            bookingRequest: seeded.bookingRequest,
            customerUserId: seeded.customerUserId,
            cookStripeAccountId: seeded.stripeAccountId,
        });

        expect(first).toEqual({ advanced: true });
        expect(slackNotifyPaymentConfirmed).toHaveBeenCalledTimes(1);
        expect(bookingRequestOfferPaymentConfirmedEmailSend).toHaveBeenCalledTimes(1);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, seeded.bookingRequestOfferId));
        expect(offer!.paymentStatus).toBe('PAYED');
    });

    it('second call with matching data does not notify again', async () => {
        const paymentIntentId = `pi_${idCreate()}`;
        const seeded = await seedOffer({
            paymentData: { paymentIntentId, clientSecret: 'sec' },
        });
        vi.mocked(seeded.serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(seeded.serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne).mockResolvedValue(`tr_${idCreate()}`);

        await bookingRequestOfferPaymentFinalize(seeded.serverRuntime, {
            offer: seeded.offer,
            bookingRequest: seeded.bookingRequest,
            customerUserId: seeded.customerUserId,
            cookStripeAccountId: seeded.stripeAccountId,
        });
        vi.mocked(slackNotifyPaymentConfirmed).mockClear();
        vi.mocked(bookingRequestOfferPaymentConfirmedEmailSend).mockClear();

        const [freshOffer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, seeded.bookingRequestOfferId));

        const second = await bookingRequestOfferPaymentFinalize(seeded.serverRuntime, {
            offer: freshOffer!,
            bookingRequest: seeded.bookingRequest,
            customerUserId: seeded.customerUserId,
            cookStripeAccountId: seeded.stripeAccountId,
        });

        expect(second).toEqual({ advanced: false });
        expect(slackNotifyPaymentConfirmed).not.toHaveBeenCalled();
        expect(bookingRequestOfferPaymentConfirmedEmailSend).not.toHaveBeenCalled();
        expect(slackNotifyPaymentFinalizeMismatch).not.toHaveBeenCalled();
    });

    it('lost claim with matching identity does not notify or warn', async () => {
        const paymentIntentId = `pi_${idCreate()}`;
        const seeded = await seedOffer({
            paymentData: { paymentIntentId, clientSecret: 'sec' },
        });
        vi.mocked(seeded.serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(seeded.serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne).mockResolvedValue(`tr_${idCreate()}`);

        // Simulate race: another channel already advanced while we still hold EMPTY snapshot.
        await testDb
            .update(bookingRequestOffers)
            .set({ paymentStatus: 'PAYED', paymentDateTime: new Date() })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, seeded.bookingRequestOfferId));

        const result = await bookingRequestOfferPaymentFinalize(seeded.serverRuntime, {
            offer: seeded.offer,
            bookingRequest: seeded.bookingRequest,
            customerUserId: seeded.customerUserId,
            cookStripeAccountId: seeded.stripeAccountId,
        });

        expect(result).toEqual({ advanced: false });
        expect(slackNotifyPaymentConfirmed).not.toHaveBeenCalled();
        expect(bookingRequestOfferPaymentConfirmedEmailSend).not.toHaveBeenCalled();
        expect(slackNotifyPaymentFinalizeMismatch).not.toHaveBeenCalled();
    });

    it('lost claim with mismatched intent warns on Slack', async () => {
        const paymentIntentId = `pi_${idCreate()}`;
        const otherPaymentIntentId = `pi_${idCreate()}`;
        const seeded = await seedOffer({
            paymentData: { paymentIntentId, clientSecret: 'sec' },
        });
        vi.mocked(seeded.serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(seeded.serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne).mockResolvedValue(`tr_${idCreate()}`);

        await testDb
            .update(bookingRequestOffers)
            .set({
                paymentStatus: 'PAYED',
                paymentDateTime: new Date(),
                paymentData: { paymentIntentId: otherPaymentIntentId, clientSecret: 'other' },
            })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, seeded.bookingRequestOfferId));

        const result = await bookingRequestOfferPaymentFinalize(seeded.serverRuntime, {
            offer: seeded.offer,
            bookingRequest: seeded.bookingRequest,
            customerUserId: seeded.customerUserId,
            cookStripeAccountId: seeded.stripeAccountId,
        });

        expect(result).toEqual({ advanced: false });
        expect(slackNotifyPaymentConfirmed).not.toHaveBeenCalled();
        expect(slackNotifyPaymentFinalizeMismatch).toHaveBeenCalledWith(
            seeded.serverRuntime,
            expect.objectContaining({
                bookingRequestId: seeded.bookingRequestId,
                bookingRequestOfferId: seeded.bookingRequestOfferId,
                detail: expect.stringContaining(paymentIntentId),
            }),
        );
    });

    it('passes a stable Stripe idempotency key for the primary extra transfer', async () => {
        const paymentIntentId = `pi_${idCreate()}`;
        const seeded = await seedOffer({
            paymentData: { paymentIntentId, clientSecret: 'sec' },
            totalCentsCustomer: 10_000,
            payoutCentsCook: 18_000,
        });
        vi.mocked(seeded.serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(seeded.serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne).mockResolvedValue(`tr_${idCreate()}`);
        vi.mocked(seeded.serverRuntime.stripe.transferCreate).mockResolvedValue({ transferId: `tr_extra_${idCreate()}` });

        await bookingRequestOfferPaymentFinalize(seeded.serverRuntime, {
            offer: seeded.offer,
            bookingRequest: seeded.bookingRequest,
            customerUserId: seeded.customerUserId,
            cookStripeAccountId: seeded.stripeAccountId,
        });

        expect(seeded.serverRuntime.stripe.transferCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                idempotencyKey: `offer-payment:${paymentIntentId}:extra-transfer`,
            }),
        );
    });
});
