import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { supportRequests } from '../db/schema';
import type { GqlSUser } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userAttentionCountsFindOne } from './userAttentionCountsFindOne';

function userParent(userId: string): GqlSUser {
    return { userId } as unknown as GqlSUser;
}

async function insertSupportRequest(userId: string, userUnreadNotificationCount: number) {
    await testDb.insert(supportRequests).values({
        supportRequestId: idCreate(),
        userId,
        subject: 'Help',
        userUnreadNotificationCount,
    });
}

describe('userAttentionCountsFindOne', () => {
    it('sums unread support replies for the requesting user', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        await insertSupportRequest(user.userId, 2);
        await insertSupportRequest(user.userId, 0);
        await insertSupportRequest(user.userId, 1);

        // Act
        const counts = await userAttentionCountsFindOne(userParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(counts).toEqual({ supportRequestUnreadCount: 3 });
    });

    it('returns zero when the user has no support requests', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();

        // Act
        const counts = await userAttentionCountsFindOne(userParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(counts).toEqual({ supportRequestUnreadCount: 0 });
    });

    it('returns null for a foreign session', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const viewer = await commandSetup.withUser();
        await insertSupportRequest(owner.user.userId, 4);

        // Act
        const counts = await userAttentionCountsFindOne(userParent(owner.user.userId), viewer.requestingSession, viewer.serverRuntime);

        // Assert
        expect(counts).toBeNull();
    });
});
