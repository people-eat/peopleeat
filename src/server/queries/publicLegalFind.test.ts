import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { adminLegalImprints, adminLegalPrivacyPolicies, adminLegalTermsAndConditions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { publicLegalFind } from './publicLegalFind';

describe('publicLegalFind', () => {
    it('returns the public shape of the latest published legal documents', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        // A far-future publishedAt guarantees this row wins the "latest published" ordering
        // even though other suites may leave their own published legal rows behind in the
        // shared test database. Keep this before commandSetup's default acceptance
        // (`9999-12-31`) so parallel workers do not see stale legal acceptance.
        const publishedAt = new Date('2999-01-01T00:00:00.000Z');
        const imprintId = idCreate();
        const privacyPolicyId = idCreate();
        const termsAndConditionsId = idCreate();
        await testDb.insert(adminLegalImprints).values({
            imprintId,
            bodyDe: 'Impressum-Body',
            changeSummaryDe: 'Impressum-Summary',
            publishedAt,
        });
        await testDb.insert(adminLegalPrivacyPolicies).values({
            privacyPolicyId,
            bodyDe: 'Datenschutz-Body',
            changeSummaryDe: 'Datenschutz-Summary',
            publishedAt,
        });
        await testDb.insert(adminLegalTermsAndConditions).values({
            termsAndConditionsId,
            bodyDe: 'AGB-Body',
            changeSummaryDe: 'AGB-Summary',
            publishedAt,
        });

        try {
            // Act
            const result = await publicLegalFind(serverRuntime);

            // Assert
            expect(result).toEqual({
                privacyPolicy: { privacyPolicyId, bodyDe: 'Datenschutz-Body', changeSummaryDe: 'Datenschutz-Summary', publishedAt },
                termsAndConditions: { termsAndConditionsId, bodyDe: 'AGB-Body', changeSummaryDe: 'AGB-Summary', publishedAt },
                imprint: { imprintId, bodyDe: 'Impressum-Body', changeSummaryDe: 'Impressum-Summary', publishedAt },
            });
        } finally {
            // Cleanup — remove the far-future rows so they don't shadow the "latest" lookup for
            // other suites once this test has run.
            await testDb.delete(adminLegalImprints).where(eq(adminLegalImprints.imprintId, imprintId));
            await testDb.delete(adminLegalPrivacyPolicies).where(eq(adminLegalPrivacyPolicies.privacyPolicyId, privacyPolicyId));
            await testDb
                .delete(adminLegalTermsAndConditions)
                .where(eq(adminLegalTermsAndConditions.termsAndConditionsId, termsAndConditionsId));
        }
    });
});
