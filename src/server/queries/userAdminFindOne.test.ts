import { describe, expect, it } from 'vitest';

import { admins } from '../db/schema';
import { toGqlUser } from '../mappers/toGqlUser';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userAdminFindOne } from './userAdminFindOne';

describe('userAdminFindOne', () => {
    it('returns the admin row for the owning session', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        await testDb.insert(admins).values({ adminId: user.userId });

        // Act
        const result = await userAdminFindOne(toGqlUser(user), requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ adminId: user.userId });
    });

    it('returns null when the owning session user is not an admin', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();

        // Act / Assert
        await expect(userAdminFindOne(toGqlUser(user), requestingSession, serverRuntime)).resolves.toBeNull();
    });

    it('returns null for a foreign session even when the target user is an admin', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        await testDb.insert(admins).values({ adminId: owner.user.userId });
        const other = await commandSetup.withUser();

        // Act / Assert
        await expect(userAdminFindOne(toGqlUser(owner.user), other.requestingSession, other.serverRuntime)).resolves.toBeNull();
    });
});
