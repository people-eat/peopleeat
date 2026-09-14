import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { toGqlUser } from '../mappers/toGqlUser';
import { commandSetup } from '../test/commandTestUtils';
import { sessionUserFindOne } from './sessionUserFindOne';

describe('sessionUserFindOne', () => {
    it('returns null when the session has no userId', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(sessionUserFindOne(requestingSession, serverRuntime)).resolves.toBeNull();
    });

    it('returns the mapped user when the session is bound to a user', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();

        // Act
        const result = await sessionUserFindOne(requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual(toGqlUser(user));
    });

    it('throws when the session has a userId but the user row is missing', async () => {
        // Arrange — session object carries a userId that has no matching row.
        const { requestingSession, serverRuntime } = await commandSetup();
        const danglingSession = { ...requestingSession, userId: idCreate() };

        // Act / Assert
        await expect(sessionUserFindOne(danglingSession, serverRuntime)).rejects.toThrow(/user not found/);
    });
});
