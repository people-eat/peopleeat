import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks } from '../../db/schema';
import type { BookingRequestOfferPaymentData } from '../../domain/bookingRequest';
import { slackNotifyPaymentConfirmed, slackNotifyPaymentFailed } from '../../slack/slackNotifyBooking';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { scheduleTestimonialReminderJobs } from '../../utils/scheduleTestimonialReminderJobs';
import { bookingRequestOfferPullPayment } from './bookingRequestOfferPullPayment';

vi.mock('../../utils/scheduleTestimonialReminderJobs', () => ({
    scheduleTestimonialReminderJobs: vi.fn(async () => {}),
}));

vi.mock('../../slack/slackNotifyBooking', () => ({
    slackNotifyPaymentConfirmed: vi.fn(async () => {}),
    slackNotifyPaymentFailed: vi.fn(async () => {}),
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

async function seedDualAcceptedSetupOffer(options?: {
    paymentStatus?: 'SETUP' | 'PAYED' | 'FAILED';
    paymentData?: BookingRequestOfferPaymentData | null;
    totalCentsCustomer?: number;
}) {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Pull' });
    await testDb.insert(cooks).values({
        cookId: cookSetup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_pull_test',
        stripeAccountActive: true,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Hi',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });

    const bookingRequestOfferId = idCreate();
    const paymentData =
        options?.paymentData === undefined ? { setupIntentId: 'si_pull_test', clientSecret: 'si_pull_test_secret' } : options.paymentData;

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
        totalCentsCustomer: options?.totalCentsCustomer ?? 23_000,
        paymentStatus: options?.paymentStatus ?? 'SETUP',
        paymentData,
        plannedPaymentPullDateTime: new Date(),
    });

    return {
        serverRuntime: cookSetup.serverRuntime,
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cookSetup.user.userId,
        customerUserId: customer.user.userId,
    };
}

describe('bookingRequestOfferPullPayment', () => {
    it('no-ops when the offer is already PAYED', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferId } = await seedDualAcceptedSetupOffer({ paymentStatus: 'PAYED' });

        // Act
        await bookingRequestOfferPullPayment.handler({
            data: { bookingRequestOfferId },
            serverRuntime,
        });

        // Assert
        expect(serverRuntime.stripe.setupIntentPaymentMethodIdFindOne).not.toHaveBeenCalled();
        expect(serverRuntime.stripe.paymentIntentCreateFromPaymentMethodWithSplit).not.toHaveBeenCalled();
        expect(scheduleTestimonialReminderJobs).not.toHaveBeenCalled();
        expect(slackNotifyPaymentConfirmed).not.toHaveBeenCalled();
    });

    it('charges the saved card, marks PAYED, publishes, and notifies', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferId, bookingRequestId, cookId, customerUserId } = await seedDualAcceptedSetupOffer();
        vi.mocked(serverRuntime.stripe.setupIntentPaymentMethodIdFindOne).mockResolvedValue('pm_pull_test');
        vi.mocked(serverRuntime.stripe.paymentIntentCreateFromPaymentMethodWithSplit).mockResolvedValue({
            paymentIntentId: 'pi_pull_test',
            clientSecret: 'pi_pull_test_secret',
        });
        vi.mocked(serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne).mockResolvedValue('tr_pull_test');

        // Act
        await bookingRequestOfferPullPayment.handler({
            data: { bookingRequestOfferId },
            serverRuntime,
        });

        // Assert
        expect(serverRuntime.stripe.setupIntentPaymentMethodIdFindOne).toHaveBeenCalledWith('si_pull_test');
        expect(serverRuntime.stripe.paymentIntentCreateFromPaymentMethodWithSplit).toHaveBeenCalledWith(
            expect.objectContaining({
                destinationAccountId: 'acct_pull_test',
                paymentMethodId: 'pm_pull_test',
                pullAmount: 23_000,
                payoutAmount: 18_400,
            }),
        );

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.paymentStatus).toBe('PAYED');
        expect(offer?.paymentDateTime).toBeInstanceOf(Date);
        expect(offer?.paymentData).toMatchObject({
            setupIntentId: 'si_pull_test',
            paymentIntentId: 'pi_pull_test',
            clientSecret: 'pi_pull_test_secret',
            transferId: 'tr_pull_test',
        });

        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customerUserId });
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cookId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
        expect(scheduleTestimonialReminderJobs).toHaveBeenCalledWith(serverRuntime, expect.objectContaining({ bookingRequestOfferId }));
        expect(slackNotifyPaymentConfirmed).toHaveBeenCalledWith(serverRuntime, {
            bookingRequestId,
            bookingRequestOfferId,
            amountCents: 23_000,
        });
    });

    it('marks FAILED, notifies Slack, and rethrows when Stripe fails', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferId, bookingRequestId } = await seedDualAcceptedSetupOffer();
        vi.mocked(serverRuntime.stripe.setupIntentPaymentMethodIdFindOne).mockResolvedValue('pm_pull_fail');
        vi.mocked(serverRuntime.stripe.paymentIntentCreateFromPaymentMethodWithSplit).mockRejectedValue(new Error('stripe charge failed'));

        // Act + Assert
        await expect(
            bookingRequestOfferPullPayment.handler({
                data: { bookingRequestOfferId },
                serverRuntime,
            }),
        ).rejects.toThrow(/stripe charge failed/);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.paymentStatus).toBe('FAILED');
        expect(slackNotifyPaymentFailed).toHaveBeenCalledWith(serverRuntime, {
            bookingRequestId,
            bookingRequestOfferId,
            detail: 'stripe charge failed',
        });
        expect(scheduleTestimonialReminderJobs).not.toHaveBeenCalled();
    });

    it('throws without marking FAILED when setupIntentId is missing', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferId } = await seedDualAcceptedSetupOffer({
            paymentData: { paymentIntentId: 'pi_only', clientSecret: 'secret' },
        });

        // Act + Assert
        await expect(
            bookingRequestOfferPullPayment.handler({
                data: { bookingRequestOfferId },
                serverRuntime,
            }),
        ).rejects.toThrow(/missing setupIntentId/);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.paymentStatus).toBe('SETUP');
        expect(slackNotifyPaymentFailed).not.toHaveBeenCalled();
        expect(serverRuntime.stripe.setupIntentPaymentMethodIdFindOne).not.toHaveBeenCalled();
    });
});
