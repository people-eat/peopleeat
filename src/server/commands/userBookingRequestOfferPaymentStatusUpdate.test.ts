import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks } from '../db/schema';
import { commandSetup, cookMutationParent, testDb, userMutationParent } from '../test/commandTestUtils';
import { cookBookingRequestOfferCreate } from './cookBookingRequestOfferCreate';
import { userBookingRequestOfferAccept } from './userBookingRequestOfferAccept';
import { userBookingRequestOfferPaymentStatusUpdate } from './userBookingRequestOfferPaymentStatusUpdate';

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

const invoiceAddress = {
    companyName: '',
    firstName: 'Customer',
    lastName: 'Host',
    country: 'DE',
    city: 'Berlin',
    postalCode: '10115',
    line1: 'Street 1',
    line2: '',
};

async function setupCookReadyToOffer() {
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Pay' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_pay',
        stripeAccountActive: true,
    });
    return setup;
}

async function dualAcceptWithPaymentIntent(eventOffsetDays: number) {
    const cook = await setupCookReadyToOffer();
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Pay' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + eventOffsetDays * 24 * 60 * 60 * 1000),
        exactEventAddress: { ...berlin, displayText: 'Berlin Mitte' },
        originalMessage: 'Hello',
        preferences: [],
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });
    await testDb.insert(bookingRequestParticipants).values({
        bookingRequestParticipantId: idCreate(),
        bookingRequestId,
        type: 'ADULT',
        name: 'Participant 1',
        restrictions: [],
    });

    const created = await cookBookingRequestOfferCreate(
        cookMutationParent(cook.user.userId),
        { input: { bookingRequestId, suggestedMenuIds: [], menuPriceCents: 20_000 } },
        cook.requestingSession,
        cook.serverRuntime,
    );
    const offerId = created.referenceId!;

    if (eventOffsetDays >= 15) {
        vi.mocked(customer.serverRuntime.stripe.setupIntentCreate).mockResolvedValue({
            setupIntentId: 'si_test',
            clientSecret: 'si_test_secret',
        });
    } else {
        vi.mocked(customer.serverRuntime.stripe.paymentIntentCreateWithSplit).mockResolvedValue({
            paymentIntentId: 'pi_test',
            clientSecret: 'pi_test_secret',
        });
    }

    await userBookingRequestOfferAccept(
        userMutationParent(customer.user.userId),
        { bookingRequestOfferId: offerId },
        customer.requestingSession,
        customer.serverRuntime,
    );

    return { cook, customer, bookingRequestId, offerId };
}

describe('userBookingRequestOfferPaymentStatusUpdate', () => {
    it('marks PaymentIntent offers PAYED after Stripe success', async () => {
        const { customer, offerId } = await dualAcceptWithPaymentIntent(7);

        vi.mocked(customer.serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(customer.serverRuntime.stripe.customerUpdate).mockResolvedValue(undefined);
        vi.mocked(customer.serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne).mockResolvedValue('tr_test');
        vi.mocked(customer.serverRuntime.jobs.enqueue).mockResolvedValue('job_testimonial');

        const result = await userBookingRequestOfferPaymentStatusUpdate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, invoiceAddress },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [offer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer!.paymentStatus).toBe('PAYED');
        expect(offer!.paymentData).toMatchObject({ paymentIntentId: 'pi_test', transferId: 'tr_test' });

        const [request] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, offer!.bookingRequestId));
        expect(request!.invoiceAddress?.firstName).toBe('Customer');
    });

    it('marks SetupIntent offers SETUP and enqueues pull jobs', async () => {
        const { customer, offerId } = await dualAcceptWithPaymentIntent(30);

        vi.mocked(customer.serverRuntime.stripe.setupIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(customer.serverRuntime.stripe.customerUpdate).mockResolvedValue(undefined);
        vi.mocked(customer.serverRuntime.jobs.enqueue).mockResolvedValue('job_pull');

        const result = await userBookingRequestOfferPaymentStatusUpdate(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, invoiceAddress },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [offer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer!.paymentStatus).toBe('SETUP');
        expect(customer.serverRuntime.jobs.enqueue).toHaveBeenCalled();
    });

    it('rejects an incomplete invoice address', async () => {
        const { customer, offerId } = await dualAcceptWithPaymentIntent(7);

        await expect(
            userBookingRequestOfferPaymentStatusUpdate(
                userMutationParent(customer.user.userId),
                {
                    bookingRequestOfferId: offerId,
                    invoiceAddress: { ...invoiceAddress, city: '', country: 'Deutschland' },
                },
                customer.requestingSession,
                customer.serverRuntime,
            ),
        ).rejects.toThrow(/invoice/);
    });
});
