import { describe, expect, it } from 'vitest';

import { cooks } from '../db/schema';
import { toGqlUser } from '../mappers/toGqlUser';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userCookFindOne } from './userCookFindOne';

describe('userCookFindOne', () => {
    it('returns the mapped cook row for the owning session', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        await testDb.insert(cooks).values({ cookId: user.userId });

        // Act
        const result = await userCookFindOne(toGqlUser(user), requestingSession, serverRuntime);

        // Assert
        expect(result).toMatchObject({ cookId: user.userId, isVisible: false, isApprovedByAdmin: false });
    });

    it('returns null when the owning session user is not a cook', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();

        // Act / Assert
        await expect(userCookFindOne(toGqlUser(user), requestingSession, serverRuntime)).resolves.toBeNull();
    });

    it('returns null for a foreign session even when the target user is a cook', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        await testDb.insert(cooks).values({ cookId: owner.user.userId });
        const other = await commandSetup.withUser();

        // Act / Assert
        await expect(userCookFindOne(toGqlUser(owner.user), other.requestingSession, other.serverRuntime)).resolves.toBeNull();
    });
});
