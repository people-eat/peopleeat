import { and, eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks } from '../db/schema';
import { commandSetup, cookMutationParent, testDb, userMutationParent } from '../test/commandTestUtils';
import { cookBookingRequestOfferAccept } from './cookBookingRequestOfferAccept';
import { cookBookingRequestOfferCreate } from './cookBookingRequestOfferCreate';
import { cookBookingRequestOfferDecline } from './cookBookingRequestOfferDecline';
import { cookBookingRequestOfferPriceUpdate } from './cookBookingRequestOfferPriceUpdate';
import { userBookingRequestOfferAccept } from './userBookingRequestOfferAccept';
import { userBookingRequestOfferDecline } from './userBookingRequestOfferDecline';
import { userBookingRequestUpdate } from './userBookingRequestUpdate';

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

async function setupCookReadyToOffer() {
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Offer' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_test',
        stripeAccountActive: true,
    });
    return setup;
}

async function insertCustomerBookingRequest() {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: {
            ...berlin,
            latitude: 52.53,
            longitude: 13.41,
        },
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: ['vegetarian'],
        expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    });
    await testDb.insert(bookingRequestParticipants).values({
        bookingRequestParticipantId: idCreate(),
        bookingRequestId,
        type: 'ADULT',
        name: 'Participant 1',
        restrictions: [],
    });
    return { customer, bookingRequestId };
}

async function createOffer(cook: Awaited<ReturnType<typeof setupCookReadyToOffer>>, bookingRequestId: string) {
    const created = await cookBookingRequestOfferCreate(
        cookMutationParent(cook.user.userId),
        { input: { bookingRequestId, suggestedMenuIds: [], menuPriceCents: 20_000 } },
        cook.requestingSession,
        cook.serverRuntime,
    );
    return created.referenceId!;
}

describe('booking offer negotiation (phase A)', () => {
    it('customer declines an offer', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);

        const declined = await userBookingRequestOfferDecline(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId, reason: 'Too expensive' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(declined.success).toBe(true);

        const [offer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer!.userAccepted).toBe(false);
        expect(offer!.userDeclinationReason).toBe('Too expensive');

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(and(eq(bookingRequestOfferEvents.bookingRequestOfferId, offerId), eq(bookingRequestOfferEvents.type, 'USER_DECLINED')));
        expect(event).toBeTruthy();
    });

    it('cook declines and can re-accept after customer material update', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);

        await userBookingRequestUpdate(
            userMutationParent(customer.user.userId),
            {
                bookingRequestId,
                occasion: null,
                dateTime: null,
                preferences: null,
                participants: [
                    { type: 'ADULT', name: 'Participant 1', restrictions: [] },
                    { type: 'ADULT', name: 'Participant 2', restrictions: [] },
                ],
            },
            customer.requestingSession,
            customer.serverRuntime,
        );

        const [afterUpdate] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(afterUpdate!.cookAccepted).toBeNull();

        const accepted = await cookBookingRequestOfferAccept(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId: offerId },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(accepted.success).toBe(true);

        const [afterAccept] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(afterAccept!.cookAccepted).toBe(true);
    });

    it('cook updates price and customer dual-accepts with PaymentIntent when event is soon', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);

        const priced = await cookBookingRequestOfferPriceUpdate(
            cookMutationParent(cook.user.userId),
            { input: { bookingRequestOfferId: offerId, menuPriceCents: 25_000 } },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(priced.success).toBe(true);

        const [pricedOffer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(pricedOffer!.menuPriceCents).toBe(25_000);

        vi.mocked(customer.serverRuntime.stripe.paymentIntentCreateWithSplit).mockResolvedValue({
            paymentIntentId: 'pi_test_accept',
            clientSecret: 'pi_test_accept_secret',
        });

        const accepted = await userBookingRequestOfferAccept(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(accepted.success).toBe(true);

        const [[offer], [request]] = await Promise.all([
            testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId)),
            testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId)),
        ]);
        expect(offer!.userAccepted).toBe(true);
        expect(offer!.cookAccepted).toBe(true);
        expect(offer!.paymentStatus).toBe('EMPTY');
        expect(offer!.paymentData).toMatchObject({ paymentIntentId: 'pi_test_accept', clientSecret: 'pi_test_accept_secret' });
        expect(offer!.totalCentsCustomer).toBeGreaterThan(0);
        expect(request!.expiresAt).toBeNull();

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(and(eq(bookingRequestOfferEvents.bookingRequestOfferId, offerId), eq(bookingRequestOfferEvents.type, 'USER_ACCEPTED')));
        expect(event).toBeTruthy();
        expect(customer.serverRuntime.stripe.paymentIntentCreateWithSplit).toHaveBeenCalledOnce();
    });

    it('cook can withdraw an open offer', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await createOffer(cook, bookingRequestId);

        const declined = await cookBookingRequestOfferDecline(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId: offerId, reason: 'Schedule conflict' },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(declined.success).toBe(true);

        const [offer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer!.cookAccepted).toBe(false);
        expect(offer!.cookDeclinationReason).toBe('Schedule conflict');
    });
});
