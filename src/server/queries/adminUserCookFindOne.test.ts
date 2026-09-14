import { describe, expect, it } from 'vitest';

import { cooks } from '../db/schema';
import type { GqlSAdminUser } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminUserCookFindOne } from './adminUserCookFindOne';

describe('adminUserCookFindOne', () => {
    it('returns the cook row when the admin user is a cook', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: user.userId, isVisible: true });
        const parent = { userId: user.userId } as GqlSAdminUser;

        // Act
        const result = await adminUserCookFindOne(parent, serverRuntime);

        // Assert
        expect(result).toMatchObject({ cookId: user.userId, isVisible: true });
    });

    it('returns null when the admin user is not a cook', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Only' });
        const parent = { userId: user.userId } as GqlSAdminUser;

        // Act
        const result = await adminUserCookFindOne(parent, serverRuntime);

        // Assert
        expect(result).toBeNull();
    });
});
