import { describe, expect, it } from 'vitest';

import { toGqlUser } from '../mappers/toGqlUser';
import { commandSetup } from '../test/commandTestUtils';
import { userLegalAcceptanceFindOne } from './userLegalAcceptanceFindOne';

describe('userLegalAcceptanceFindOne', () => {
    it('returns no pending documents when the user has far-future acceptance', async () => {
        // Arrange — stamp acceptance beyond any publishedAt other suites may insert
        // into the shared test DB (e.g. publicLegalFind uses 2999-01-01).
        const farFuture = new Date('9000-01-01T00:00:00.000Z');
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            lastAcceptedPrivacyPolicy: farFuture,
            lastAcceptedTerms: farFuture,
        });

        // Act
        const result = await userLegalAcceptanceFindOne(toGqlUser(user), requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({
            required: false,
            pendingPrivacyPolicy: null,
            pendingTermsAndConditions: null,
        });
    });

    it('returns null for a foreign session', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();

        // Act / Assert
        await expect(userLegalAcceptanceFindOne(toGqlUser(owner.user), other.requestingSession, other.serverRuntime)).resolves.toBeNull();
    });
});
