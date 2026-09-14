import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { commandSetup } from '../test/commandTestUtils';
import { adminUserFindOne } from './adminUserFindOne';

describe('adminUserFindOne', () => {
    it('returns the mapped user row', async () => {
        // Arrange
        const { user, requestingSession, serverRuntime } = await commandSetup.withUser({ firstName: 'detail-user', lastName: 'User' });

        // Act
        const row = await adminUserFindOne({ userId: user.userId }, requestingSession, serverRuntime);

        // Assert
        expect(row).toMatchObject({
            userId: user.userId,
            emailAddress: user.emailAddress,
            firstName: 'detail-user',
            lastName: 'User',
            status: 'ACTIVE',
            types: ['customer'],
            createdAt: user.createdAt,
        });
    });

    it('returns null when the user id is unknown', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act / Assert
        await expect(adminUserFindOne({ userId: idCreate() }, requestingSession, serverRuntime)).resolves.toBeNull();
    });
});
