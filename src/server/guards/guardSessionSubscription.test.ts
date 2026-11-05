import { describe, expect, it, vi } from 'vitest';

import { commandSetup } from '../test/commandTestUtils';
import { guardSessionSubscription } from './guardSessionSubscription';

describe('guardSessionSubscription', () => {
    it('subscribes to the session channel without a signed-in user', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const updates = (async function* () {})();
        vi.mocked(serverRuntime.subscribe.to).mockReturnValue(updates);

        // Act
        const result = guardSessionSubscription(requestingSession, serverRuntime);

        // Assert
        expect(result).toBe(updates);
        expect(serverRuntime.subscribe.to).toHaveBeenCalledTimes(1);
        expect(serverRuntime.subscribe.to).toHaveBeenCalledWith(`session-updates:${requestingSession.sessionId}`);
    });
});
