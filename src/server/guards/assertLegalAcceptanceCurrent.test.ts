import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { adminLegalPrivacyPolicies } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { assertLegalAcceptanceCurrent } from './assertLegalAcceptanceCurrent';

describe('assertLegalAcceptanceCurrent', () => {
    it('resolves when acceptance is newer than any published document', async () => {
        // Arrange — commandSetup stamps 9999-12-31, after publishedAt values other suites insert
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();

        // Act / Assert
        await expect(assertLegalAcceptanceCurrent(user.userId, requestingSession, serverRuntime)).resolves.toBeUndefined();
    });

    it('throws when published privacy is newer than the user acceptance', async () => {
        // Arrange — 2999 stays before the default 9999 acceptance so parallel suites stay current
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            lastAcceptedPrivacyPolicy: null,
            lastAcceptedTerms: null,
        });
        const privacyPolicyId = idCreate();
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId,
            bodyDe: 'Datenschutz',
            changeSummaryDe: 'Summary',
            publishedAt: new Date('2999-01-01T00:00:00.000Z'),
        });

        try {
            // Act / Assert
            await expect(assertLegalAcceptanceCurrent(user.userId, requestingSession, serverRuntime)).rejects.toThrow('Unauthorized');
        } finally {
            await testDb.delete(adminLegalPrivacyPolicies).where(eq(adminLegalPrivacyPolicies.privacyPolicyId, privacyPolicyId));
        }
    });

    it('throws when the user does not exist', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(assertLegalAcceptanceCurrent(idCreate(), requestingSession, serverRuntime)).rejects.toThrow('Unauthorized');
    });

    it('resolves during admin impersonation even when acceptance is stale', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withStaleLegalAcceptance();
        requestingSession.impersonationReturnSessionId = idCreate();

        // Act / Assert
        await expect(assertLegalAcceptanceCurrent(user.userId, requestingSession, serverRuntime)).resolves.toBeUndefined();
    });
});
