import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { bookingRequestCheckoutFunnelArea } from '../../shared/bookingRequestCheckoutFunnel';
import { bookingRequestFormFunnelArea } from '../../shared/bookingRequestFormFunnel';
import { chefsDiscoveryArea, chefsDiscoveryMealOpenKey, chefsDiscoveryMenuOpenKey } from '../../shared/chefsDiscovery';
import { idCreate } from '../../shared/idCreate';
import { sessionEvents } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionWebPageInteractionCreate } from './sessionWebPageInteractionCreate';

describe('sessionWebPageInteractionCreate', () => {
    it('inserts a structured booking-form step_completed event', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const result = await sessionWebPageInteractionCreate(
            {
                input: {
                    webPageKey: 'BOOKING_REQUEST_FORM',
                    area: bookingRequestFormFunnelArea,
                    interaction: { type: 'step_completed', step: 'occasion' },
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, result.referenceId!));
        expect(row).toMatchObject({
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'BOOKING_REQUEST_FORM',
                area: bookingRequestFormFunnelArea,
                interaction: { type: 'step_completed', step: 'occasion' },
            },
        });
    });

    it('keeps cookId on chef-page form steps and book_cta clicks', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const cookId = idCreate();

        const formResult = await sessionWebPageInteractionCreate(
            {
                input: {
                    webPageKey: 'BOOKING_REQUEST_FORM',
                    area: bookingRequestFormFunnelArea,
                    interaction: { type: 'step_entered', step: 'occasion', cookId },
                },
            },
            requestingSession,
            serverRuntime,
        );
        const [formRow] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, formResult.referenceId!));
        expect(formRow?.payload).toMatchObject({
            interaction: { type: 'step_entered', step: 'occasion', cookId },
        });

        const clickResult = await sessionWebPageInteractionCreate(
            {
                input: {
                    webPageKey: 'CHEFS',
                    area: 'chefs',
                    interaction: { type: 'click', key: 'book_cta', cookId },
                },
            },
            requestingSession,
            serverRuntime,
        );
        const [clickRow] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, clickResult.referenceId!));
        expect(clickRow?.payload).toMatchObject({
            interaction: { type: 'click', key: 'book_cta', cookId },
        });
    });

    it('keeps menuId and mealId on chef-page catalog open clicks', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const cookId = idCreate();
        const menuId = idCreate();
        const mealId = idCreate();

        const menuResult = await sessionWebPageInteractionCreate(
            {
                input: {
                    webPageKey: 'CHEFS',
                    area: chefsDiscoveryArea,
                    interaction: { type: 'click', key: chefsDiscoveryMenuOpenKey, cookId, menuId },
                },
            },
            requestingSession,
            serverRuntime,
        );
        const [menuRow] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, menuResult.referenceId!));
        expect(menuRow?.payload).toMatchObject({
            interaction: { type: 'click', key: chefsDiscoveryMenuOpenKey, cookId, menuId },
        });

        const mealResult = await sessionWebPageInteractionCreate(
            {
                input: {
                    webPageKey: 'CHEFS',
                    area: chefsDiscoveryArea,
                    interaction: { type: 'click', key: chefsDiscoveryMealOpenKey, cookId, mealId },
                },
            },
            requestingSession,
            serverRuntime,
        );
        const [mealRow] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, mealResult.referenceId!));
        expect(mealRow?.payload).toMatchObject({
            interaction: { type: 'click', key: chefsDiscoveryMealOpenKey, cookId, mealId },
        });
    });

    it('rejects funnel steps outside the booking_request_form area', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act / Assert
        await expect(
            sessionWebPageInteractionCreate(
                {
                    input: {
                        webPageKey: 'BOOKING_REQUEST_FORM',
                        area: 'other_area',
                        interaction: { type: 'step_completed', step: 'occasion' },
                    },
                },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/funnel steps require a known funnel area/);
    });

    it('inserts a booking checkout funnel step with bookingRequestId', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const bookingRequestId = idCreate();

        const result = await sessionWebPageInteractionCreate(
            {
                input: {
                    webPageKey: 'PROFILE',
                    area: bookingRequestCheckoutFunnelArea,
                    bookingRequestId,
                    interaction: { type: 'step_entered', step: 'checkout' },
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, result.referenceId!));
        expect(row).toMatchObject({
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'PROFILE',
                area: bookingRequestCheckoutFunnelArea,
                bookingRequestId,
                interaction: { type: 'step_entered', step: 'checkout' },
            },
        });
    });
});
