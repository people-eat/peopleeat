import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { sessions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminSessionFindOne } from './adminSessionFindOne';

describe('adminSessionFindOne', () => {
    it('returns the mapped session row', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'session-detail-admin', lastName: 'User' });
        const sessionId = idCreate();
        const [row] = await testDb
            .insert(sessions)
            .values({
                sessionId,
                userAgent: 'detail-agent',
                landingPath: '/welcome',
                isBot: false,
            })
            .returning();

        // Act
        const result = await adminSessionFindOne({ sessionId }, setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(result).toMatchObject({
            sessionId,
            userAgent: 'detail-agent',
            landingPath: '/welcome',
            isBot: false,
            createdAt: row!.createdAt,
        });
    });

    it('returns null when the session id is unknown', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'session-detail-miss', lastName: 'User' });

        // Act / Assert
        await expect(adminSessionFindOne({ sessionId: idCreate() }, setup.requestingSession, setup.serverRuntime)).resolves.toBeNull();
    });
});
