import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { adminLegalTermsAndConditions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminLegalTermsAndConditionsFindMany } from './adminLegalTermsAndConditionsFindMany';

describe('adminLegalTermsAndConditionsFindMany', () => {
    it('returns seeded terms drafts ordered by createdAt descending', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const olderId = idCreate();
        const newerId = idCreate();
        await testDb.insert(adminLegalTermsAndConditions).values([
            {
                termsAndConditionsId: olderId,
                bodyDe: 'older-body',
                changeSummaryDe: 'older-summary',
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
            },
            {
                termsAndConditionsId: newerId,
                bodyDe: 'newer-body',
                changeSummaryDe: 'newer-summary',
                createdAt: new Date('2024-06-01T00:00:00.000Z'),
            },
        ]);

        // Act
        const rows = await adminLegalTermsAndConditionsFindMany(serverRuntime);

        // Assert
        const olderIdx = rows.findIndex((row) => row.termsAndConditionsId === olderId);
        const newerIdx = rows.findIndex((row) => row.termsAndConditionsId === newerId);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
        expect(rows[newerIdx]).toMatchObject({ termsAndConditionsId: newerId, bodyDe: 'newer-body' });
    });
});
