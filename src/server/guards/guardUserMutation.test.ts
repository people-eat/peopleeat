import { describe, expect, it } from 'vitest';

import { commandSetup } from '../test/commandTestUtils';
import { guardUserMutation } from './guardUserMutation';

describe('guardUserMutation', () => {
    it('rejects a session with no user', async () => {
        // Arrange
        const { requestingSession } = await commandSetup();

        // Act / Assert
        expect(() => guardUserMutation(requestingSession)).toThrow('Unauthorized');
    });

    it('returns the session user id', async () => {
        // Arrange
        const { requestingSession, user } = await commandSetup.withUser();

        // Act
        const result = guardUserMutation(requestingSession);

        // Assert
        expect(result).toEqual({ userId: user.userId });
    });
});
