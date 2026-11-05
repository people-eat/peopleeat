import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, sessionEvents } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { adminAnalyticsBookingRequestCheckoutFlow } from './adminAnalyticsBookingRequestCheckoutFlow';
import { adminAnalyticsChefSignUpFlow } from './adminAnalyticsChefSignUpFlow';
import { adminAnalyticsGiftCardFlow } from './adminAnalyticsGiftCardFlow';

function windowCreate() {
    const startMs = Date.UTC(2400, 0, 1) + Math.floor(Math.random() * 1e12);
    return {
        range: { startDateTime: new Date(startMs), endDateTime: new Date(startMs + 86_400_000) },
        at(index: number) {
            return new Date(startMs + (index + 1) * 1_000);
        },
    };
}

async function stamp(sessionEventId: string, createdAt: Date) {
    await testDb.update(sessionEvents).set({ createdAt }).where(eq(sessionEvents.sessionEventId, sessionEventId));
}

async function recordInteraction(
    serverRuntime: ServerRuntime,
    sessionId: string,
    createdAt: Date,
    payload: {
        webPageKey: 'BOOKING_REQUEST' | 'GIFT_CARD' | 'CHEF_SIGN_UP';
        area: string;
        interaction:
            | { type: 'step_completed'; step: 'checkout' }
            | { type: 'step_completed'; step: 'configure' }
            | { type: 'step_completed'; step: 'auth' | 'profile' };
    },
) {
    const created = await sessionEventCreate(serverRuntime, {
        sessionId,
        type: 'WEB_PAGE_INTERACTION',
        payload,
    });
    await stamp(created.sessionEventId, createdAt);
}

describe('adminAnalyticsBookingRequestCheckoutFlow', () => {
    it('counts the checkout area through paid and skips cook sessions', async () => {
        // Arrange
        const human = await commandSetup();
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Checkout' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const window = windowCreate();
        await recordInteraction(human.serverRuntime, human.requestingSession.sessionId, window.at(0), {
            webPageKey: 'BOOKING_REQUEST',
            area: 'booking_request_checkout',
            interaction: { type: 'step_completed', step: 'checkout' },
        });
        const humanPaid = await sessionEventCreate(human.serverRuntime, {
            sessionId: human.requestingSession.sessionId,
            type: 'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED',
            payload: { bookingRequestId: idCreate(), bookingRequestOfferId: idCreate() },
        });
        await stamp(humanPaid.sessionEventId, window.at(1));
        await recordInteraction(cook.serverRuntime, cook.requestingSession.sessionId, window.at(2), {
            webPageKey: 'BOOKING_REQUEST',
            area: 'booking_request_checkout',
            interaction: { type: 'step_completed', step: 'checkout' },
        });
        const cookPaid = await sessionEventCreate(cook.serverRuntime, {
            sessionId: cook.requestingSession.sessionId,
            type: 'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED',
            payload: { bookingRequestId: idCreate(), bookingRequestOfferId: idCreate() },
        });
        await stamp(cookPaid.sessionEventId, window.at(3));

        // Act
        const flow = await adminAnalyticsBookingRequestCheckoutFlow(window.range, human.requestingSession, human.serverRuntime);

        // Assert
        expect(flow.steps.map((step) => step.id)).toEqual(['checkout', 'paid']);
        expect(flow.steps.find((step) => step.id === 'checkout')).toMatchObject({
            labelDe: 'Checkout',
            labelEn: 'Checkout',
            completedCount: 1,
        });
        expect(flow.steps.find((step) => step.id === 'paid')).toMatchObject({
            labelDe: 'Bezahlt',
            labelEn: 'Paid',
            enteredCount: 0,
            completedCount: 1,
        });
        expect(flow.links).toEqual([{ source: 'checkout', target: 'paid', value: 1 }]);
        expect(flow.terminalCount).toBe(1);
    });
});

describe('adminAnalyticsGiftCardFlow', () => {
    it('counts the gift card area through created and skips cook sessions', async () => {
        // Arrange
        const human = await commandSetup();
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'GiftCard' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const window = windowCreate();
        await recordInteraction(human.serverRuntime, human.requestingSession.sessionId, window.at(0), {
            webPageKey: 'GIFT_CARD',
            area: 'gift_card',
            interaction: { type: 'step_completed', step: 'configure' },
        });
        const humanCreated = await sessionEventCreate(human.serverRuntime, {
            sessionId: human.requestingSession.sessionId,
            type: 'GIFT_CARD_CREATED',
            payload: { giftCardId: idCreate() },
        });
        await stamp(humanCreated.sessionEventId, window.at(1));
        await recordInteraction(cook.serverRuntime, cook.requestingSession.sessionId, window.at(2), {
            webPageKey: 'GIFT_CARD',
            area: 'gift_card',
            interaction: { type: 'step_completed', step: 'configure' },
        });
        const cookCreated = await sessionEventCreate(cook.serverRuntime, {
            sessionId: cook.requestingSession.sessionId,
            type: 'GIFT_CARD_CREATED',
            payload: { giftCardId: idCreate() },
        });
        await stamp(cookCreated.sessionEventId, window.at(3));

        // Act
        const flow = await adminAnalyticsGiftCardFlow(window.range, human.requestingSession, human.serverRuntime);

        // Assert
        expect(flow.steps.map((step) => step.id)).toEqual(['configure', 'auth', 'created', 'checkout', 'paid']);
        expect(flow.steps.find((step) => step.id === 'configure')).toMatchObject({
            labelDe: 'Konfiguration',
            labelEn: 'Configure',
            completedCount: 1,
        });
        expect(flow.steps.find((step) => step.id === 'created')).toMatchObject({
            labelDe: 'Geschenkkarte erstellt',
            labelEn: 'Gift card created',
            completedCount: 1,
        });
        expect(flow.links).toEqual([{ source: 'configure', target: 'created', value: 1 }]);
        expect(flow.terminalCount).toBe(1);
    });
});

describe('adminAnalyticsChefSignUpFlow', () => {
    it('counts a cook session through the chef sign-up area to created', async () => {
        // Arrange
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'SignUp' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const window = windowCreate();
        const sessionId = cook.requestingSession.sessionId;
        await recordInteraction(cook.serverRuntime, sessionId, window.at(0), {
            webPageKey: 'CHEF_SIGN_UP',
            area: 'chef_sign_up',
            interaction: { type: 'step_completed', step: 'auth' },
        });
        await recordInteraction(cook.serverRuntime, sessionId, window.at(1), {
            webPageKey: 'CHEF_SIGN_UP',
            area: 'chef_sign_up',
            interaction: { type: 'step_completed', step: 'profile' },
        });
        const created = await sessionEventCreate(cook.serverRuntime, {
            sessionId,
            type: 'COOK_CREATED',
            payload: {},
        });
        await stamp(created.sessionEventId, window.at(2));

        // Act
        const flow = await adminAnalyticsChefSignUpFlow(window.range, cook.requestingSession, cook.serverRuntime);

        // Assert
        expect(flow.steps.map((step) => step.id)).toEqual(['auth', 'profile', 'created']);
        expect(flow.steps.find((step) => step.id === 'auth')).toMatchObject({
            labelDe: 'Anmeldung',
            labelEn: 'Sign-in',
            completedCount: 1,
        });
        expect(flow.steps.find((step) => step.id === 'profile')).toMatchObject({
            labelDe: 'Koch-Profil',
            labelEn: 'Chef profile',
            completedCount: 1,
        });
        expect(flow.steps.find((step) => step.id === 'created')).toMatchObject({
            labelDe: 'Koch-Konto erstellt',
            labelEn: 'Chef account created',
            completedCount: 1,
        });
        expect(flow.links).toEqual([
            { source: 'auth', target: 'profile', value: 1 },
            { source: 'profile', target: 'created', value: 1 },
        ]);
        expect(flow.terminalCount).toBe(1);
    });
});
