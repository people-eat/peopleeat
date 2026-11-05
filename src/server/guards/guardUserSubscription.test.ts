import { describe, expect, it, vi } from 'vitest';

import { commandSetup } from '../test/commandTestUtils';
import { guardUserSubscription } from './guardUserSubscription';

describe('guardUserSubscription', () => {
    it('rejects a session with no user', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act / Assert
        expect(() => guardUserSubscription(requestingSession, serverRuntime)).toThrow('Unauthorized');
        expect(serverRuntime.subscribe.to).not.toHaveBeenCalled();
    });

    it('subscribes to the user channel', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const updates = (async function* () {})();
        vi.mocked(serverRuntime.subscribe.to).mockReturnValue(updates);

        // Act
        const result = guardUserSubscription(requestingSession, serverRuntime);

        // Assert
        expect(result).toBe(updates);
        expect(serverRuntime.subscribe.to).toHaveBeenCalledTimes(1);
        expect(serverRuntime.subscribe.to).toHaveBeenCalledWith(user.userId);
    });
});
