import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { bookingRequestCheckoutFunnelArea } from '../../shared/bookingRequestCheckoutFunnel';
import { bookingRequestFormFunnelArea } from '../../shared/bookingRequestFormFunnel';
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
