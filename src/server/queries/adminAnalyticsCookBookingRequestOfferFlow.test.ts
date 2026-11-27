import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { adminAnalyticsCookBookingRequestOfferFlow } from './adminAnalyticsCookBookingRequestOfferFlow';

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

async function insertCustomerBookingRequest() {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: { ...berlin, latitude: 52.53, longitude: 13.41 },
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    return bookingRequestId;
}

async function insertOffer(bookingRequestId: string, cookId: string, createdAt?: Date) {
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId: idCreate(),
        bookingRequestId,
        cookId,
        menuPriceCents: 5000,
        travelExpensesCents: 0,
        paymentProviderFeeCents: 0,
        platformFeePercentCook: 10,
        platformFeePercentCustomer: 10,
        platformFeeCentsCook: 500,
        platformFeeCentsCustomer: 500,
        payoutCentsCook: 4500,
        totalWithoutDiscountsCentsCustomer: 5500,
        ...(createdAt ? { createdAt } : {}),
    });
}

describe('adminAnalyticsCookBookingRequestOfferFlow', () => {
    it('builds notified → opened → declined for cooks who decline without create UI', async () => {
        const admin = await commandSetup.withUser({ firstName: 'analytics-admin', lastName: 'User' });
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Decline' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const bookingRequestId = await insertCustomerBookingRequest();
        const startMs = Date.UTC(2100, 0, 1) + Math.floor(Math.random() * 1e12);
        const notifiedAt = new Date(startMs + 3_600_000);
        await testDb.insert(bookingRequestCooks).values({
            cookId: cook.user.userId,
            bookingRequestId,
            notifiedAt,
            declinedAt: new Date(startMs + 3_800_000),
            declinationReason: 'Too far',
            menuEvaluationLoading: false,
        });

        const flow = await adminAnalyticsCookBookingRequestOfferFlow(
            { startDateTime: notifiedAt, endDateTime: new Date(notifiedAt.getTime() + 1) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(flow.notifiedCount).toBe(1);
        expect(flow.openedCount).toBe(1);
        expect(flow.declinedCount).toBe(1);
        expect(flow.offersCreatedCount).toBe(0);
        expect(flow.steps.find((step) => step.id === 'opened')?.completedCount).toBe(1);
        expect(flow.links).toEqual([
            { source: 'notified', target: 'opened', value: 1 },
            { source: 'opened', target: 'declined', value: 1 },
        ]);
    });

    it('does not mark create-UI steps completed for an offer with no UI events', async () => {
        const admin = await commandSetup.withUser({ firstName: 'analytics-admin-hist', lastName: 'User' });
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Legacy' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const bookingRequestId = await insertCustomerBookingRequest();
        const startMs = Date.UTC(2100, 0, 1) + Math.floor(Math.random() * 1e12);
        const notifiedAt = new Date(startMs + 3_600_000);
        await testDb.insert(bookingRequestCooks).values({
            cookId: cook.user.userId,
            bookingRequestId,
            notifiedAt,
            firstOpenedAt: new Date(startMs + 3_700_000),
            menuEvaluationLoading: false,
        });
        await insertOffer(bookingRequestId, cook.user.userId);

        const flow = await adminAnalyticsCookBookingRequestOfferFlow(
            { startDateTime: notifiedAt, endDateTime: new Date(notifiedAt.getTime() + 1) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(flow.notifiedCount).toBe(1);
        expect(flow.openedCount).toBe(1);
        expect(flow.offersCreatedCount).toBe(1);
        expect(flow.steps.find((step) => step.id === 'menus')?.completedCount).toBe(0);
        expect(flow.steps.find((step) => step.id === 'price')?.completedCount).toBe(0);
        expect(flow.steps.find((step) => step.id === 'message')?.completedCount).toBe(0);
        expect(flow.links).toEqual([
            { source: 'notified', target: 'opened', value: 1 },
            { source: 'opened', target: 'created', value: 1 },
        ]);
    });

    it('does not backfill message from an offer when only offer_create was entered', async () => {
        const admin = await commandSetup.withUser({ firstName: 'analytics-admin-enter', lastName: 'User' });
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Partial' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const bookingRequestId = await insertCustomerBookingRequest();
        const startMs = Date.UTC(2100, 0, 1) + Math.floor(Math.random() * 1e12);
        const notifiedAt = new Date(startMs + 3_600_000);
        await testDb.insert(bookingRequestCooks).values({
            cookId: cook.user.userId,
            bookingRequestId,
            notifiedAt,
            firstOpenedAt: new Date(startMs + 3_700_000),
            menuEvaluationLoading: false,
        });
        await sessionEventCreate(cook.serverRuntime, {
            sessionId: cook.requestingSession.sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'PROFILE',
                area: 'cook_booking_request_offer',
                bookingRequestId,
                interaction: { type: 'step_entered', step: 'offer_create' },
            },
        });
        await insertOffer(bookingRequestId, cook.user.userId);

        const flow = await adminAnalyticsCookBookingRequestOfferFlow(
            { startDateTime: notifiedAt, endDateTime: new Date(notifiedAt.getTime() + 1) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(flow.offersCreatedCount).toBe(1);
        expect(flow.steps.find((step) => step.id === 'offer_create')).toMatchObject({ enteredCount: 1, completedCount: 0 });
        expect(flow.steps.find((step) => step.id === 'message')?.completedCount).toBe(0);
        expect(flow.links.some((link) => link.source === 'opened' && link.target === 'created')).toBe(true);
        expect(flow.links.some((link) => link.target === 'message')).toBe(false);
    });

    it('joins live create-UI completions onto the notified cohort without inferring from the offer', async () => {
        const admin = await commandSetup.withUser({ firstName: 'analytics-admin-offer', lastName: 'User' });
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Offer' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const bookingRequestId = await insertCustomerBookingRequest();
        const startMs = Date.UTC(2100, 0, 1) + Math.floor(Math.random() * 1e12);
        const notifiedAt = new Date(startMs + 3_600_000);
        await testDb.insert(bookingRequestCooks).values({
            cookId: cook.user.userId,
            bookingRequestId,
            notifiedAt,
            firstOpenedAt: new Date(startMs + 3_700_000),
            menuEvaluationLoading: false,
        });
        await sessionEventCreate(cook.serverRuntime, {
            sessionId: cook.requestingSession.sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'PROFILE',
                area: 'cook_booking_request_offer',
                bookingRequestId,
                interaction: { type: 'step_entered', step: 'offer_create' },
            },
        });
        await sessionEventCreate(cook.serverRuntime, {
            sessionId: cook.requestingSession.sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'PROFILE',
                area: 'cook_booking_request_offer',
                bookingRequestId,
                interaction: { type: 'step_completed', step: 'menus' },
            },
        });
        await sessionEventCreate(cook.serverRuntime, {
            sessionId: cook.requestingSession.sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'PROFILE',
                area: 'cook_booking_request_offer',
                bookingRequestId,
                interaction: { type: 'step_entered', step: 'price' },
            },
        });
        await insertOffer(bookingRequestId, cook.user.userId);

        const flow = await adminAnalyticsCookBookingRequestOfferFlow(
            { startDateTime: notifiedAt, endDateTime: new Date(notifiedAt.getTime() + 1) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(flow.notifiedCount).toBe(1);
        expect(flow.offersCreatedCount).toBe(1);
        expect(flow.steps.find((step) => step.id === 'offer_create')?.completedCount).toBe(1);
        expect(flow.steps.find((step) => step.id === 'menus')?.completedCount).toBe(1);
        expect(flow.steps.find((step) => step.id === 'price')?.completedCount).toBe(0);
        expect(flow.steps.find((step) => step.id === 'message')?.completedCount).toBe(0);
        expect(flow.links.some((link) => link.source === 'opened' && link.target === 'offer_create')).toBe(true);
        expect(flow.links.some((link) => link.source === 'offer_create' && link.target === 'menus')).toBe(true);
        expect(flow.links.some((link) => link.source === 'menus' && link.target === 'created')).toBe(true);
        expect(flow.links.some((link) => link.source === 'price' && link.target === 'message')).toBe(false);
    });

    it('returns median notify-to-offer minutes for the notified cohort', async () => {
        const admin = await commandSetup.withUser({ firstName: 'analytics-admin-median', lastName: 'User' });
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Median' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const bookingRequestId = await insertCustomerBookingRequest();
        const notifiedAt = new Date('2035-01-10T12:00:00.000Z');
        const offerCreatedAt = new Date('2035-01-10T18:00:00.000Z');
        await testDb.insert(bookingRequestCooks).values({
            cookId: cook.user.userId,
            bookingRequestId,
            notifiedAt,
            firstOpenedAt: new Date('2035-01-10T13:00:00.000Z'),
            menuEvaluationLoading: false,
        });
        await insertOffer(bookingRequestId, cook.user.userId, offerCreatedAt);

        const flow = await adminAnalyticsCookBookingRequestOfferFlow(
            { startDateTime: notifiedAt, endDateTime: new Date(notifiedAt.getTime() + 1) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(flow.medianNotifyToOfferMinutes).toBe(360);
    });
});
