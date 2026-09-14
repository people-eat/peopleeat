import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { GqlSSession } from '../graphql/generated';
import { commandSetup } from '../test/commandTestUtils';
import { sessionFindOne } from './sessionFindOne';

describe('sessionFindOne', () => {
    it('returns the mapped session row', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();

        // Act
        const result = await sessionFindOne(requestingSession, serverRuntime);

        // Assert
        expect(result).toMatchObject({
            sessionId: requestingSession.sessionId,
            userId: null,
            user: null,
            authEmailOtp: null,
            giftCard: null,
            giftCardPurchaseError: null,
            locationSuggestions: [],
        });
    });

    it('throws when the session id is not found', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const unknownSession = { gqlTypeName: 'Session', sessionId: idCreate(), userId: null } as unknown as GqlSSession;

        // Act / Assert
        await expect(sessionFindOne(unknownSession, serverRuntime)).rejects.toThrow(/sessionFindOne: session not found/);
    });
});
