import { describe, expect, it, vi } from 'vitest';

import { admins } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { guardAdminSubscription } from './guardAdminSubscription';

describe('guardAdminSubscription', () => {
    it('rejects a session with no user', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act / Assert
        await expect(guardAdminSubscription(requestingSession, serverRuntime)).rejects.toThrow('Unauthorized');
        expect(serverRuntime.subscribe.to).not.toHaveBeenCalled();
    });

    it('rejects a signed-in user who is not an admin', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup.withUser();

        // Act / Assert
        await expect(guardAdminSubscription(requestingSession, serverRuntime)).rejects.toThrow('Unauthorized');
        expect(serverRuntime.subscribe.to).not.toHaveBeenCalled();
    });

    it('subscribes an admin to the shared admin-updates channel', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        await testDb.insert(admins).values({ adminId: user.userId });
        const updates = (async function* () {})();
        vi.mocked(serverRuntime.subscribe.to).mockReturnValue(updates);

        // Act
        const result = await guardAdminSubscription(requestingSession, serverRuntime);

        // Assert
        expect(result).toBe(updates);
        expect(serverRuntime.subscribe.to).toHaveBeenCalledTimes(1);
        expect(serverRuntime.subscribe.to).toHaveBeenCalledWith('admin-updates');
    });
});
