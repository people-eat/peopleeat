import { describe, expect, it } from 'vitest';

import { cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { guardCookMutation } from './guardCookMutation';

describe('guardCookMutation', () => {
    it('rejects a session with no user', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act / Assert
        await expect(guardCookMutation(requestingSession, serverRuntime)).rejects.toThrow('Unauthorized');
    });

    it('rejects a signed-in user who is not a cook', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup.withUser({ status: 'BANNED' });

        // Act / Assert — membership is checked before account status
        await expect(guardCookMutation(requestingSession, serverRuntime)).rejects.toThrow('Unauthorized');
    });

    it('rejects a banned cook', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup.withUser({ status: 'BANNED' });
        await testDb.insert(cooks).values({ cookId: requestingSession.userId! });

        // Act / Assert
        await expect(guardCookMutation(requestingSession, serverRuntime)).rejects.toThrow(/guardCookMutation: user is not active/);
    });

    it('returns the cook id for an active cook', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        await testDb.insert(cooks).values({ cookId: user.userId });

        // Act
        const result = await guardCookMutation(requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ cookId: user.userId });
    });
});
