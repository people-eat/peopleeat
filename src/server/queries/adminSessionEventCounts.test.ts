import { describe, expect, it } from 'vitest';

import { commandSetup } from '../test/commandTestUtils';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { adminSessionEventCounts } from './adminSessionEventCounts';

describe('adminSessionEventCounts', () => {
    it('returns one count per criterion in order', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'session-event-counts', lastName: 'Admin' });
        await sessionEventCreate(setup.serverRuntime, {
            sessionId: setup.requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'LANDING', path: '/' },
        });
        await sessionEventCreate(setup.serverRuntime, {
            sessionId: setup.requestingSession.sessionId,
            type: 'WEB_PAGE_INTERACTION',
            payload: {
                webPageKey: 'BOOKING_REQUEST_FORM',
                area: 'booking_request_form',
                interaction: { type: 'step_completed', step: 'occasion' },
            },
        });

        // Act
        const [bySession, byUser, visitsOnly] = await adminSessionEventCounts(
            {
                criteria: [
                    { sessionIds: [setup.requestingSession.sessionId], userIds: null, types: null, skip: 0, take: 50 },
                    { sessionIds: null, userIds: [setup.user.userId], types: null, skip: 0, take: 50 },
                    {
                        sessionIds: [setup.requestingSession.sessionId],
                        userIds: null,
                        types: ['WEB_PAGE_VISITED'],
                        skip: 0,
                        take: 50,
                    },
                ],
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(bySession).toBeGreaterThanOrEqual(2);
        expect(byUser).toBeGreaterThanOrEqual(2);
        expect(visitsOnly).toBeGreaterThanOrEqual(1);
        expect(visitsOnly!).toBeLessThanOrEqual(bySession!);
    });

    it('requires sessionIds or userIds', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'session-event-counts-empty', lastName: 'Admin' });

        // Act / Assert
        await expect(
            adminSessionEventCounts(
                { criteria: [{ sessionIds: null, userIds: null, types: null, skip: 0, take: 10 }] },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(/sessionIds or userIds required/);
    });

    it('rejects empty criteria', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'session-event-counts-none', lastName: 'Admin' });

        // Act / Assert
        await expect(adminSessionEventCounts({ criteria: [] }, setup.requestingSession, setup.serverRuntime)).rejects.toThrow(
            /criteria must not be empty/,
        );
    });
});
