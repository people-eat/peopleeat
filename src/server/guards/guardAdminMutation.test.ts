import { describe, expect, it } from 'vitest';

import { admins } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { guardAdminMutation } from './guardAdminMutation';

describe('guardAdminMutation', () => {
    it('rejects a session with no user', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act / Assert
        await expect(guardAdminMutation(requestingSession, serverRuntime)).rejects.toThrow('Unauthorized');
    });

    it('rejects a signed-in user who is not an admin', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup.withUser();

        // Act / Assert
        await expect(guardAdminMutation(requestingSession, serverRuntime)).rejects.toThrow('Unauthorized');
    });

    it('returns the admin id when the user has an Admins row', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        await testDb.insert(admins).values({ adminId: user.userId });

        // Act
        const result = await guardAdminMutation(requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ adminId: user.userId });
    });
});
