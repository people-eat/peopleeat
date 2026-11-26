import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { sessionEvents, sessions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import {
    bookingRequestOfferPaymentFailedSessionEventCreate,
    bookingRequestOfferPaymentSucceededSessionEventCreate,
} from './bookingRequestOfferPaymentSessionEventCreate';
import { sessionEventCreate } from './sessionEventCreate';

describe('bookingRequestOfferPaymentSucceededSessionEventCreate', () => {
    it('attaches to the checkout-interaction session when sessionId is missing', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Pay', lastName: 'Customer' });
        const checkoutSessionId = idCreate();
        await testDb.insert(sessions).values({ sessionId: checkoutSessionId, userId: setup.user.userId });
        const bookingRequestId = idCreate();
        const bookingRequestOfferId = idCreate();
        await sessionEventCreate(setup.serverRuntime, {
            sessionId: checkoutSessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'PROFILE',
                area: 'booking_request_checkout',
                bookingRequestId,
                interaction: { type: 'step_entered', step: 'checkout' },
            },
        });
        await testDb
            .update(sessions)
            .set({ lastInteractionAt: new Date(Date.now() + 60_000) })
            .where(eq(sessions.sessionId, setup.requestingSession.sessionId));

        await bookingRequestOfferPaymentSucceededSessionEventCreate(setup.serverRuntime, {
            customerUserId: setup.user.userId,
            bookingRequestId,
            bookingRequestOfferId,
        });

        const events = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, checkoutSessionId));
        expect(events.some((event) => event.type === 'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED')).toBe(true);
        const onLatest = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, setup.requestingSession.sessionId));
        expect(onLatest.some((event) => event.type === 'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED')).toBe(false);
    });

    it('falls back to the latest session when there is no checkout interaction', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Pay', lastName: 'Fallback' });
        const bookingRequestId = idCreate();
        const bookingRequestOfferId = idCreate();

        await bookingRequestOfferPaymentSucceededSessionEventCreate(setup.serverRuntime, {
            customerUserId: setup.user.userId,
            bookingRequestId,
            bookingRequestOfferId,
        });

        const events = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, setup.requestingSession.sessionId));
        expect(events.some((event) => event.type === 'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED')).toBe(true);
    });

    it('keeps an explicit sessionId', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Pay', lastName: 'Explicit' });
        const otherSessionId = idCreate();
        await testDb.insert(sessions).values({ sessionId: otherSessionId, userId: setup.user.userId });
        const bookingRequestId = idCreate();
        await sessionEventCreate(setup.serverRuntime, {
            sessionId: otherSessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'PROFILE',
                area: 'booking_request_checkout',
                bookingRequestId,
                interaction: { type: 'step_entered', step: 'checkout' },
            },
        });

        await bookingRequestOfferPaymentFailedSessionEventCreate(setup.serverRuntime, {
            sessionId: setup.requestingSession.sessionId,
            customerUserId: setup.user.userId,
            bookingRequestId,
            bookingRequestOfferId: idCreate(),
        });

        const events = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, setup.requestingSession.sessionId));
        expect(events.some((event) => event.type === 'BOOKING_REQUEST_OFFER_PAYMENT_FAILED')).toBe(true);
    });
});
