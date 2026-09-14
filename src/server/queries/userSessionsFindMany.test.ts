import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { sessions } from '../db/schema';
import { toGqlUser } from '../mappers/toGqlUser';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userSessionsFindMany } from './userSessionsFindMany';

describe('userSessionsFindMany', () => {
    it('returns unterminated sessions and marks the current one', async () => {
        // Arrange — `commandSetup.withUser` already persisted `requestingSession`
        // as an unterminated session row owned by `user`.
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const otherSessionId = idCreate();
        await testDb.insert(sessions).values({ sessionId: otherSessionId, userId: user.userId });
        const terminatedSessionId = idCreate();
        await testDb.insert(sessions).values({ sessionId: terminatedSessionId, userId: user.userId, wasTerminatedAt: new Date() });

        // Act
        const result = await userSessionsFindMany(toGqlUser(user), requestingSession, serverRuntime);

        // Assert
        expect(result.map((s) => s.sessionId).sort()).toEqual([requestingSession.sessionId, otherSessionId].sort());
        expect(result.find((s) => s.sessionId === requestingSession.sessionId)?.isCurrent).toBe(true);
        expect(result.find((s) => s.sessionId === otherSessionId)?.isCurrent).toBe(false);
        expect(result.some((s) => s.sessionId === terminatedSessionId)).toBe(false);
    });

    it('returns an empty list for a foreign session', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();

        // Act
        const result = await userSessionsFindMany(toGqlUser(owner.user), other.requestingSession, other.serverRuntime);

        // Assert
        expect(result).toEqual([]);
    });
});
