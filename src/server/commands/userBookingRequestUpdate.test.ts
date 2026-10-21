import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { BookingRequestCreate } from '../db/schema';
import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks, featureToggles } from '../db/schema';
import { commandSetup, cookMutationParent, testDb, userMutationParent } from '../test/commandTestUtils';
import { cookBookingRequestOfferCreate } from './cookBookingRequestOfferCreate';
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

const munich = {
    displayText: 'München',
    latitude: 48.137,
    longitude: 11.575,
    addressLine1: 'Marienplatz 1',
    addressLine2: '',
    city: 'München',
    postCode: '80331',
    state: 'BY',
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

async function insertCustomerBookingRequest(overrides: Partial<BookingRequestCreate> = {}, adultCount = 2) {
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
        preferences: [],
        expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        ...overrides,
    });
    await testDb.insert(bookingRequestParticipants).values(
        Array.from({ length: adultCount }, (_, index) => ({
            bookingRequestParticipantId: idCreate(),
            bookingRequestId,
            type: 'ADULT' as const,
            name: `Guest ${index + 1}`,
            restrictions: [],
        })),
    );
    return { customer, bookingRequestId };
}

describe('userBookingRequestUpdate', () => {
    it('patches venue, resets cook acceptance, and recalculates travel', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest();

        const created = await cookBookingRequestOfferCreate(
            cookMutationParent(cook.user.userId),
            { input: { bookingRequestId, suggestedMenuIds: [], menuPriceCents: 20_000 } },
            cook.requestingSession,
            cook.serverRuntime,
        );
        const bookingRequestOfferId = created.referenceId!;

        await testDb
            .update(bookingRequestOffers)
            .set({ cookAccepted: true })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        const [before] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        expect(cook.serverRuntime.places.drivingDistanceKm).toHaveBeenCalled();

        const result = await userBookingRequestUpdate(
            userMutationParent(customer.user.userId),
            {
                bookingRequestId,
                occasion: null,
                dateTime: null,
                preferences: null,
                participants: [
                    { type: 'ADULT', name: 'Guest 1', restrictions: [] },
                    { type: 'ADULT', name: 'Guest 2', restrictions: [] },
                ],
                exactEventAddress: munich,
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [request] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(request?.exactEventAddress.city).toBe('München');

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.cookAccepted).toBeNull();
        expect(offer?.travelDistanceKm).not.toBe(before?.travelDistanceKm);
        expect(offer?.cookUnreadNotificationCount).toBeGreaterThan(before?.cookUnreadNotificationCount ?? 0);
        expect(offer?.priceAutoAdjustReason).toBe('TRAVEL');
    });

    it('scales menu price when paid headcount changes and sets PARTICIPANTS reason', async () => {
        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest({}, 4);

        const created = await cookBookingRequestOfferCreate(
            cookMutationParent(cook.user.userId),
            { input: { bookingRequestId, suggestedMenuIds: [], menuPriceCents: 40_000 } },
            cook.requestingSession,
            cook.serverRuntime,
        );
        const bookingRequestOfferId = created.referenceId!;

        await testDb
            .update(bookingRequestOffers)
            .set({ cookAccepted: true })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        const result = await userBookingRequestUpdate(
            userMutationParent(customer.user.userId),
            {
                bookingRequestId,
                occasion: null,
                dateTime: null,
                preferences: null,
                participants: [
                    { type: 'ADULT', name: 'Guest 1', restrictions: [] },
                    { type: 'ADULT', name: 'Guest 2', restrictions: [] },
                ],
                exactEventAddress: null,
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.cookAccepted).toBeNull();
        expect(offer?.menuPriceCents).toBe(20_000);
        expect(offer?.priceAutoAdjustReason).toBe('PARTICIPANTS');
    });

    it('does not scale menu when only restrictions change', async () => {
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'BOOKING_REQUEST_RESTRICTIONS', enabled: true })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: true },
            });

        const cook = await setupCookReadyToOffer();
        const { customer, bookingRequestId } = await insertCustomerBookingRequest({}, 2);

        const created = await cookBookingRequestOfferCreate(
            cookMutationParent(cook.user.userId),
            { input: { bookingRequestId, suggestedMenuIds: [], menuPriceCents: 20_000 } },
            cook.requestingSession,
            cook.serverRuntime,
        );
        const bookingRequestOfferId = created.referenceId!;

        await testDb
            .update(bookingRequestOffers)
            .set({ cookAccepted: true, priceAutoAdjustReason: null })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        const result = await userBookingRequestUpdate(
            userMutationParent(customer.user.userId),
            {
                bookingRequestId,
                occasion: null,
                dateTime: null,
                preferences: null,
                participants: [
                    { type: 'ADULT', name: 'Guest 1', restrictions: ['gluten'] },
                    { type: 'ADULT', name: 'Guest 2', restrictions: [] },
                ],
                exactEventAddress: null,
            },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.cookAccepted).toBeNull();
        expect(offer?.menuPriceCents).toBe(20_000);
        expect(offer?.priceAutoAdjustReason).toBeNull();
    });
});
