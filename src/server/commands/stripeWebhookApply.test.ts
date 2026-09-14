import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { BookingRequestOfferPaymentData } from '../domain/bookingRequest';
import { slackNotifyPaymentFailed } from '../slack/slackNotifyBooking';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { stripeWebhookApply } from './stripeWebhookApply';

vi.mock('../slack/slackNotifyBooking', () => ({
    slackNotifyPaymentFailed: vi.fn(async () => {}),
    slackNotifyPaymentConfirmed: vi.fn(async () => {}),
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
    stripeAccountId?: string;
}) {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Hook' });
    await testDb.insert(cooks).values({
        cookId: cookSetup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: options.stripeAccountId ?? `acct_${idCreate()}`,
        stripeAccountActive: true,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Hook' });
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
        paymentStatus: options.paymentStatus ?? 'EMPTY',
        paymentData: options.paymentData,
    });

    return {
        serverRuntime: cookSetup.serverRuntime,
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cookSetup.user.userId,
        customerUserId: customer.user.userId,
    };
}

describe('stripeWebhookApply', () => {
    beforeEach(() => {
        vi.mocked(slackNotifyPaymentFailed).mockClear();
    });

    it('ignores unknown event types without side effects', async () => {
        const { serverRuntime } = await commandSetup.withUser({ firstName: 'a', lastName: 'b' });

        await stripeWebhookApply({ id: 'evt_1', type: 'payment_intent.created', dataObject: { id: `pi_${idCreate()}` } }, serverRuntime);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('finalizes PAYED on payment_intent.succeeded', async () => {
        const paymentIntentId = `pi_${idCreate()}`;
        const { serverRuntime, bookingRequestOfferId } = await seedOffer({
            paymentData: { paymentIntentId, clientSecret: 'sec' },
        });
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne).mockResolvedValue(`tr_${idCreate()}`);

        await stripeWebhookApply({ id: 'evt_2', type: 'payment_intent.succeeded', dataObject: { id: paymentIntentId } }, serverRuntime);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer!.paymentStatus).toBe('PAYED');
    });

    it('marks FAILED on payment_intent.payment_failed', async () => {
        const paymentIntentId = `pi_${idCreate()}`;
        const { serverRuntime, bookingRequestOfferId, bookingRequestId } = await seedOffer({
            paymentData: { paymentIntentId, clientSecret: 'sec' },
        });

        await stripeWebhookApply(
            { id: 'evt_3', type: 'payment_intent.payment_failed', dataObject: { id: paymentIntentId } },
            serverRuntime,
        );

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer!.paymentStatus).toBe('FAILED');
        expect(slackNotifyPaymentFailed).toHaveBeenCalledWith(serverRuntime, {
            bookingRequestId,
            bookingRequestOfferId,
            detail: 'payment_intent.payment_failed',
        });
    });

    it('does not downgrade an already PAYED offer on payment_intent.canceled', async () => {
        const paymentIntentId = `pi_${idCreate()}`;
        const { serverRuntime, bookingRequestOfferId } = await seedOffer({
            paymentStatus: 'PAYED',
            paymentData: { paymentIntentId, clientSecret: 'sec' },
        });

        await stripeWebhookApply({ id: 'evt_4', type: 'payment_intent.canceled', dataObject: { id: paymentIntentId } }, serverRuntime);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer!.paymentStatus).toBe('PAYED');
        expect(slackNotifyPaymentFailed).not.toHaveBeenCalled();
    });

    it('finalizes SETUP on setup_intent.succeeded', async () => {
        const setupIntentId = `si_${idCreate()}`;
        const { serverRuntime, bookingRequestOfferId } = await seedOffer({
            paymentData: { setupIntentId, clientSecret: 'sec' },
        });
        vi.mocked(serverRuntime.stripe.setupIntentSucceededCheck).mockResolvedValue(true);

        await stripeWebhookApply({ id: 'evt_5', type: 'setup_intent.succeeded', dataObject: { id: setupIntentId } }, serverRuntime);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer!.paymentStatus).toBe('SETUP');
    });

    it('syncs Connect flags on account.updated', async () => {
        const stripeAccountId = `acct_${idCreate()}`;
        const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Acct' });
        await testDb.insert(cooks).values({
            cookId: cookSetup.user.userId,
            stripeAccountId,
            stripeAccountActive: true,
            stripeAccountActiveWasReset: false,
        });
        vi.mocked(cookSetup.serverRuntime.stripe.accountOnboardingCompletedCheck).mockResolvedValue(false);

        await stripeWebhookApply({ id: 'evt_6', type: 'account.updated', dataObject: { id: stripeAccountId } }, cookSetup.serverRuntime);

        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, cookSetup.user.userId));
        expect(row!.stripeAccountActive).toBe(false);
        expect(row!.stripeAccountActiveWasReset).toBe(true);
    });

    it('no-ops account.updated when no cook matches', async () => {
        const { serverRuntime } = await commandSetup.withUser({ firstName: 'a', lastName: 'b' });

        await stripeWebhookApply({ id: 'evt_7', type: 'account.updated', dataObject: { id: `acct_${idCreate()}` } }, serverRuntime);

        expect(serverRuntime.stripe.accountOnboardingCompletedCheck).not.toHaveBeenCalled();
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
