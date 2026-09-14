import { and, asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cooks, menus } from '../db/schema';
import { commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { cookBookingRequestDecline } from './cookBookingRequestDecline';
import { cookBookingRequestOfferCreate } from './cookBookingRequestOfferCreate';
import { cookBookingRequestOpen } from './cookBookingRequestOpen';
import { cookMenuCreate } from './cookMenuCreate';

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
        preferences: [],
    });
    return { customer, bookingRequestId };
}

describe('cook booking pool + offer create', () => {
    it('opens a pool request and stamps firstOpenedAt', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId } = await insertCustomerBookingRequest();

        const opened = await cookBookingRequestOpen(
            cookMutationParent(cook.user.userId),
            { bookingRequestId },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(opened).toEqual({ success: true, referenceId: bookingRequestId });

        const [details] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, cook.user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(details?.firstOpenedAt).toBeTruthy();
    });

    it('declines a pool request', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId } = await insertCustomerBookingRequest();

        const declined = await cookBookingRequestDecline(
            cookMutationParent(cook.user.userId),
            { bookingRequestId, reason: 'Too far this week' },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(declined.success).toBe(true);

        const [details] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, cook.user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(details?.declinedAt).toBeTruthy();
        expect(details?.declinationReason).toBe('Too far this week');
    });

    it('creates a price-only offer and an offer with a menu copy', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId, customer } = await insertCustomerBookingRequest();

        const priceOnly = await cookBookingRequestOfferCreate(
            cookMutationParent(cook.user.userId),
            { input: { bookingRequestId, suggestedMenuIds: [], menuPriceCents: 20_000 } },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(priceOnly.success).toBe(true);
        expect(priceOnly.referenceId).toBeTruthy();

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, priceOnly.referenceId!));
        expect(offer!.cookAccepted).toBe(true);
        expect(offer!.userAccepted).toBeNull();
        expect(offer!.menuPriceCents).toBe(20_000);
        expect(offer!.platformFeePercentCook).toBe(18);
        expect(offer!.travelDistanceKm).toBeGreaterThan(0);

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, priceOnly.referenceId!))
            .orderBy(asc(bookingRequestOfferEvents.createdAt));
        expect(events).toHaveLength(2);
        expect(events[0]!.type).toBe('USER_MESSAGE_SIMPLE');
        expect(events[0]!.payload).toEqual({ messageBody: 'Looking for a chef' });
        expect(events[1]!.type).toBe('COOK_CREATED');

        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });

        // Second request + menu offer
        const second = await insertCustomerBookingRequest();
        const menu = await cookMenuCreate(cookMutationParent(cook.user.userId), cook.requestingSession, cook.serverRuntime);
        const withMenu = await cookBookingRequestOfferCreate(
            cookMutationParent(cook.user.userId),
            {
                input: {
                    bookingRequestId: second.bookingRequestId,
                    suggestedMenuIds: [menu.referenceId!],
                    menuPriceCents: 25_000,
                },
            },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(withMenu.success).toBe(true);

        const offerMenus = await testDb.select().from(menus).where(eq(menus.bookingRequestOfferId, withMenu.referenceId!));
        expect(offerMenus).toHaveLength(1);
        expect(offerMenus[0]!.copyOfMenuId).toBe(menu.referenceId);
    });

    it('rejects offer create when cook cannot create offers', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Unapproved', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: setup.user.userId,
            isVisible: true,
            isApprovedByAdmin: false,
            exactTravelOriginAddress: berlin,
            stripeAccountId: null,
            stripeAccountActive: false,
        });
        const { bookingRequestId } = await insertCustomerBookingRequest();

        await expect(
            cookBookingRequestOfferCreate(
                cookMutationParent(setup.user.userId),
                { input: { bookingRequestId, suggestedMenuIds: [], menuPriceCents: 20_000 } },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(/cannot create offers/);
    });

    it('seeds an optional cook message after COOK_CREATED', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId } = await insertCustomerBookingRequest();

        const created = await cookBookingRequestOfferCreate(
            cookMutationParent(cook.user.userId),
            {
                input: {
                    bookingRequestId,
                    suggestedMenuIds: [],
                    menuPriceCents: 20_000,
                    message: 'Looking forward to cooking for you!',
                },
            },
            cook.requestingSession,
            cook.serverRuntime,
        );

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, created.referenceId!))
            .orderBy(asc(bookingRequestOfferEvents.createdAt));
        expect(events.map((event) => event.type)).toEqual(['USER_MESSAGE_SIMPLE', 'COOK_CREATED', 'COOK_MESSAGE_SIMPLE']);
        expect(events[2]!.payload).toEqual({ messageBody: 'Looking forward to cooking for you!' });
    });

    it('rejects offer create when the cook message contains a phone number', async () => {
        const cook = await setupCookReadyToOffer();
        const { bookingRequestId } = await insertCustomerBookingRequest();

        await expect(
            cookBookingRequestOfferCreate(
                cookMutationParent(cook.user.userId),
                {
                    input: {
                        bookingRequestId,
                        suggestedMenuIds: [],
                        menuPriceCents: 20_000,
                        message: 'Call me at +49 151 12345678',
                    },
                },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/phone numbers are not allowed/);
    });
});
