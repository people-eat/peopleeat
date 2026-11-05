import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { adminLegalPrivacyPolicies } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { assertLegalAcceptanceCurrent } from './assertLegalAcceptanceCurrent';

describe('assertLegalAcceptanceCurrent', () => {
    it('resolves when acceptance is newer than any published document', async () => {
        // Arrange — commandSetup stamps 9999-12-31, after publishedAt values other suites insert
        const { serverRuntime, user } = await commandSetup.withUser();

        // Act / Assert
        await expect(assertLegalAcceptanceCurrent(user.userId, serverRuntime)).resolves.toBeUndefined();
    });

    it('throws when published privacy is newer than the user acceptance', async () => {
        // Arrange — 2999 stays before the default 9999 acceptance so parallel suites stay current
        const { serverRuntime, user } = await commandSetup.withUser({
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
            await expect(assertLegalAcceptanceCurrent(user.userId, serverRuntime)).rejects.toThrow('Unauthorized');
        } finally {
            await testDb.delete(adminLegalPrivacyPolicies).where(eq(adminLegalPrivacyPolicies.privacyPolicyId, privacyPolicyId));
        }
    });

    it('throws when the user does not exist', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(assertLegalAcceptanceCurrent(idCreate(), serverRuntime)).rejects.toThrow('Unauthorized');
    });
});
