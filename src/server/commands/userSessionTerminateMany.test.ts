import { eq, inArray } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { sessions } from '../db/schema';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { userSessionTerminateMany } from './userSessionTerminateMany';

describe('userSessionTerminateMany', () => {
    it('terminates matching sessions for the user and publishes userUpdates', async () => {
        // Arrange — two extra sessions belonging to the same user.
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const sessionA = idCreate();
        const sessionB = idCreate();
        const sessionKeep = idCreate();
        await testDb.insert(sessions).values([
            { sessionId: sessionA, userId: user.userId },
            { sessionId: sessionB, userId: user.userId },
            { sessionId: sessionKeep, userId: user.userId },
        ]);

        // Act
        const result = await userSessionTerminateMany(
            userMutationParent(user.userId),
            { sessionIds: [sessionA, sessionB] },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true });
        const rows = await testDb
            .select()
            .from(sessions)
            .where(inArray(sessions.sessionId, [sessionA, sessionB, sessionKeep, requestingSession.sessionId]));
        const byId = Object.fromEntries(rows.map((row) => [row.sessionId, row]));
        expect(byId[sessionA]?.wasTerminatedAt).toBeInstanceOf(Date);
        expect(byId[sessionB]?.wasTerminatedAt).toBeInstanceOf(Date);
        expect(byId[sessionKeep]?.wasTerminatedAt).toBeNull();
        expect(byId[requestingSession.sessionId]?.wasTerminatedAt).toBeNull();

        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('does not terminate sessions owned by another user', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const foreignSessionId = idCreate();
        await testDb.insert(sessions).values({ sessionId: foreignSessionId, userId: other.user.userId });

        // Act — owner attempts to terminate the other user's session.
        const result = await userSessionTerminateMany(
            userMutationParent(owner.user.userId),
            { sessionIds: [foreignSessionId] },
            owner.requestingSession,
            owner.serverRuntime,
        );

        // Assert — foreign session untouched; publish still fires (command always publishes).
        expect(result).toEqual({ success: true });
        const [foreign] = await testDb.select().from(sessions).where(eq(sessions.sessionId, foreignSessionId));
        expect(foreign?.wasTerminatedAt).toBeNull();
        expect(owner.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: owner.user.userId });
    });

    it('publishes even when no sessions match', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const unknownSessionId = idCreate();

        // Act
        const result = await userSessionTerminateMany(
            userMutationParent(user.userId),
            { sessionIds: [unknownSessionId] },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true });
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        const [own] = await testDb.select().from(sessions).where(eq(sessions.sessionId, requestingSession.sessionId));
        expect(own?.wasTerminatedAt).toBeNull();
    });
});
