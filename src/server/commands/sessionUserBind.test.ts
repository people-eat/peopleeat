import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { sessions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionUserBind } from './sessionUserBind';

describe('sessionUserBind', () => {
    it('binds the session row, mutates requestingSession, and publishes sessionUpdates', async () => {
        // Arrange — anonymous session; user seeded separately so the FK holds.
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const anonymous = await commandSetup();
        expect(anonymous.requestingSession.userId).toBeNull();

        // Act
        await sessionUserBind(anonymous.requestingSession.sessionId, user.userId, anonymous.requestingSession, anonymous.serverRuntime);

        // Assert — DB row + in-memory session + publish.
        const [row] = await testDb.select().from(sessions).where(eq(sessions.sessionId, anonymous.requestingSession.sessionId));
        expect(row?.userId).toBe(user.userId);
        expect(anonymous.requestingSession.userId).toBe(user.userId);
        expect(anonymous.serverRuntime.publish.sessionUpdates).toHaveBeenCalledTimes(1);
        expect(anonymous.serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({
            sessionId: anonymous.requestingSession.sessionId,
        });
        // The withUser session is untouched.
        expect(requestingSession.userId).toBe(user.userId);
        expect(serverRuntime.publish.sessionUpdates).not.toHaveBeenCalled();
    });

    it('rebinds an already-bound session to a different user', async () => {
        // Arrange
        const first = await commandSetup.withUser({ firstName: 'first', lastName: 'User' });
        const second = await commandSetup.withUser({ firstName: 'second', lastName: 'User' });

        // Act — rebind first's session onto the second user.
        await sessionUserBind(first.requestingSession.sessionId, second.user.userId, first.requestingSession, first.serverRuntime);

        // Assert
        const [row] = await testDb.select().from(sessions).where(eq(sessions.sessionId, first.requestingSession.sessionId));
        expect(row?.userId).toBe(second.user.userId);
        expect(first.requestingSession.userId).toBe(second.user.userId);
        expect(first.serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({
            sessionId: first.requestingSession.sessionId,
        });
    });
});
