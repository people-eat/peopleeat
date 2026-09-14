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

describe('adminAnalyticsCookBookingRequestOfferFlow', () => {
    it('builds notified → opened → declined for cooks who decline without create UI', async () => {
        // Arrange
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
            // No firstOpenedAt: opened is inferred from declined.
            declinedAt: new Date(startMs + 3_800_000),
            declinationReason: 'Too far',
            menuEvaluationLoading: false,
        });

        // Act
        const flow = await adminAnalyticsCookBookingRequestOfferFlow(
            { startDateTime: new Date(startMs), endDateTime: new Date(startMs + 86_400_000) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(flow.notifiedCount).toBeGreaterThanOrEqual(1);
        expect(flow.openedCount).toBeGreaterThanOrEqual(1);
        expect(flow.declinedCount).toBeGreaterThanOrEqual(1);
        expect(flow.offersCreatedCount).toBe(0);
        expect(flow.steps.find((step) => step.id === 'opened')?.completedCount).toBeGreaterThanOrEqual(1);
        expect(flow.links.some((link) => link.source === 'notified' && link.target === 'opened')).toBe(true);
        expect(flow.links.some((link) => link.source === 'opened' && link.target === 'declined')).toBe(true);
    });

    it('joins create-UI interactions and offer rows onto the notified cohort', async () => {
        // Arrange
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
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId,
            cookId: cook.user.userId,
            menuPriceCents: 5000,
            travelExpensesCents: 0,
            paymentProviderFeeCents: 0,
            platformFeePercentCook: 10,
            platformFeePercentCustomer: 10,
            platformFeeCentsCook: 500,
            platformFeeCentsCustomer: 500,
            payoutCentsCook: 4500,
            totalWithoutDiscountsCentsCustomer: 5500,
        });

        // Act
        const flow = await adminAnalyticsCookBookingRequestOfferFlow(
            { startDateTime: new Date(startMs), endDateTime: new Date(startMs + 86_400_000) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(flow.offersCreatedCount).toBeGreaterThanOrEqual(1);
        expect(flow.links.some((link) => link.source === 'opened' && link.target === 'offer_create')).toBe(true);
        expect(flow.links.some((link) => link.source === 'price' && link.target === 'created')).toBe(true);
        const menus = flow.steps.find((step) => step.id === 'menus');
        expect(menus?.completedCount).toBeGreaterThanOrEqual(1);
    });
});
