import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequestParticipants,
    bookingRequests,
    cooks,
    giftCards,
} from '../db/schema';
import { commandSetup, cookMutationParent, testDb, userMutationParent } from '../test/commandTestUtils';
import { cookBookingRequestOfferCreate } from './cookBookingRequestOfferCreate';
import { userBookingRequestOfferAccept } from './userBookingRequestOfferAccept';

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
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Accept' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: `acct_${idCreate()}`,
        stripeAccountActive: true,
    });
    return setup;
}

async function insertCustomerBookingRequest(eventOffsetDays: number) {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Accept' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + eventOffsetDays * 24 * 60 * 60 * 1000),
        exactEventAddress: { ...berlin, latitude: 52.53, longitude: 13.41 },
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

function expectFeeSnapshot(offer: {
    menuPriceCents: number;
    travelExpensesCents: number;
    platformFeePercentCook: number;
    platformFeePercentCustomer: number;
    paymentProviderFeeCents: number;
    platformFeeCentsCook: number;
    totalWithoutDiscountsCentsCustomer: number;
}) {
    const price = bookingRequestOfferPriceCalculate({
        menuPriceCents: offer.menuPriceCents,
        travelExpensesCents: offer.travelExpensesCents,
        platformFeePercentCook: offer.platformFeePercentCook,
        platformFeePercentCustomer: offer.platformFeePercentCustomer,
    });
    expect(offer.platformFeePercentCook).toBe(18);
    expect(offer.platformFeePercentCustomer).toBe(4);
    expect(offer.platformFeeCentsCook).toBe(price.platformFeeCentsCook);
    expect(offer.paymentProviderFeeCents).toBe(price.paymentProviderFeeCents);
    expect(offer.paymentProviderFeeCents).toBeGreaterThan(0);
    expect(offer.totalWithoutDiscountsCentsCustomer).toBe(price.totalWithoutDiscountsCentsCustomer);
}

describe('userBookingRequestOfferAccept', () => {
    it('prepares a SetupIntent when the event is at least 15 days out and snapshots fees', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest(30);
        const offerId = await createOffer(cook, bookingRequestId);
        vi.mocked(customer.serverRuntime.stripe.setupIntentCreate).mockResolvedValue({
            setupIntentId: 'si_accept_far',
            clientSecret: 'si_accept_far_secret',
        });

        const accepted = await userBookingRequestOfferAccept(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        expect(accepted.success).toBe(true);
        const [offer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer!.userAccepted).toBe(true);
        expect(offer!.paymentStatus).toBe('EMPTY');
        expect(offer!.paymentData).toEqual({ setupIntentId: 'si_accept_far', clientSecret: 'si_accept_far_secret' });
        expect(offer!.plannedPaymentPullDateTime).toBeInstanceOf(Date);
        expect(offer!.totalCentsCustomer).toBe(offer!.totalWithoutDiscountsCentsCustomer);
        expectFeeSnapshot(offer!);
        expect(customer.serverRuntime.stripe.setupIntentCreate).toHaveBeenCalledOnce();
        expect(customer.serverRuntime.stripe.paymentIntentCreateWithSplit).not.toHaveBeenCalled();
    });

    it('prepares a PaymentIntent when the event is inside 15 days and snapshots fees', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest(3);
        const offerId = await createOffer(cook, bookingRequestId);
        vi.mocked(customer.serverRuntime.stripe.paymentIntentCreateWithSplit).mockResolvedValue({
            paymentIntentId: 'pi_accept_soon',
            clientSecret: 'pi_accept_soon_secret',
        });

        const accepted = await userBookingRequestOfferAccept(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        expect(accepted.success).toBe(true);
        const [offer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer!.paymentStatus).toBe('EMPTY');
        expect(offer!.paymentData).toEqual({ paymentIntentId: 'pi_accept_soon', clientSecret: 'pi_accept_soon_secret' });
        expect(offer!.plannedPaymentPullDateTime).toBeNull();
        expect(offer!.totalCentsCustomer).toBeGreaterThan(0);
        expectFeeSnapshot(offer!);
        expect(customer.serverRuntime.stripe.paymentIntentCreateWithSplit).toHaveBeenCalledOnce();
        expect(customer.serverRuntime.stripe.setupIntentCreate).not.toHaveBeenCalled();
    });

    it('keeps locked travel on accept even when Routes would return a different distance', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest(30);
        const offerId = await createOffer(cook, bookingRequestId);
        const [before] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(before!.travelExpensesCents).toBeGreaterThan(0);

        vi.mocked(customer.serverRuntime.places.drivingDistanceKm).mockResolvedValue(500);
        await testDb.update(cooks).set({ travelExpensesAmount: 99 }).where(eq(cooks.cookId, cook.user.userId));
        vi.mocked(customer.serverRuntime.stripe.setupIntentCreate).mockResolvedValue({
            setupIntentId: 'si_accept_travel_lock',
            clientSecret: 'si_accept_travel_lock_secret',
        });

        const accepted = await userBookingRequestOfferAccept(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        expect(accepted.success).toBe(true);
        const [after] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(after!.travelExpensesCents).toBe(before!.travelExpensesCents);
        expect(after!.travelDistanceKm).toBe(before!.travelDistanceKm);
        expect(after!.totalWithoutDiscountsCentsCustomer).toBe(before!.totalWithoutDiscountsCentsCustomer);
        expect(customer.serverRuntime.places.drivingDistanceKm).not.toHaveBeenCalled();

        const events = await testDb
            .select({ type: bookingRequestOfferEvents.type })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, offerId));
        expect(events.map((event) => event.type)).not.toContain('SYSTEM_CHANGED_PRICE');
        expect(events.map((event) => event.type)).toContain('USER_ACCEPTED');
    });

    it('marks a fully discounted offer PAYED via transfer and keeps the fee snapshot', async () => {
        const cook = await setupCookReadyToOffer();
        const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Zero' });
        const buyerEmail = customer.user.emailAddress;
        if (!buyerEmail) {
            throw new Error('userBookingRequestOfferAccept.test: customer email required');
        }
        const giftCardId = idCreate();
        await testDb.insert(giftCards).values({
            giftCardId,
            sessionId: customer.requestingSession.sessionId,
            buyerUserId: customer.user.userId,
            buyerEmail,
            locale: 'en',
            occasion: 'Dinner',
            recipientName: 'Host',
            message: '',
            originalBalanceCents: 100_000_000,
            balanceCents: 100_000_000,
            redeemCode: `GC-${giftCardId}`,
            paymentIntentId: `pi_${giftCardId}`,
            paymentClientSecret: 'secret',
            paymentStatus: 'PAYED',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            exactEventAddress: { ...berlin, latitude: 52.53, longitude: 13.41 },
            originalMessage: 'Hello',
            preferences: [],
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            giftCardId,
        });
        await testDb.insert(bookingRequestParticipants).values({
            bookingRequestParticipantId: idCreate(),
            bookingRequestId,
            type: 'ADULT',
            name: 'Participant 1',
            restrictions: [],
        });

        const offerId = await createOffer(cook, bookingRequestId);
        vi.mocked(customer.serverRuntime.stripe.transferCreate).mockResolvedValue({ transferId: 'tr_accept_zero' });

        const accepted = await userBookingRequestOfferAccept(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId: offerId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        expect(accepted.success).toBe(true);
        const [offer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer!.paymentStatus).toBe('PAYED');
        expect(offer!.paymentData).toEqual({ transferId: 'tr_accept_zero' });
        expect(offer!.totalCentsCustomer).toBe(0);
        expect(offer!.giftCardAppliedCents).toBe(offer!.totalWithoutDiscountsCentsCustomer);
        expectFeeSnapshot(offer!);
        expect(customer.serverRuntime.stripe.transferCreate).toHaveBeenCalledOnce();
        expect(customer.serverRuntime.stripe.setupIntentCreate).not.toHaveBeenCalled();

        const [card] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, giftCardId));
        expect(card!.balanceCents).toBe(100_000_000 - offer!.giftCardAppliedCents);
    });
});
