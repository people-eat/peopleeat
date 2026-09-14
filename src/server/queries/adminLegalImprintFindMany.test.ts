import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { adminLegalImprints } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminLegalImprintFindMany } from './adminLegalImprintFindMany';

describe('adminLegalImprintFindMany', () => {
    it('returns seeded imprint drafts ordered by createdAt descending', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const olderId = idCreate();
        const newerId = idCreate();
        await testDb.insert(adminLegalImprints).values([
            {
                imprintId: olderId,
                bodyDe: 'older-body',
                changeSummaryDe: 'older-summary',
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
            },
            {
                imprintId: newerId,
                bodyDe: 'newer-body',
                changeSummaryDe: 'newer-summary',
                createdAt: new Date('2024-06-01T00:00:00.000Z'),
            },
        ]);

        // Act
        const rows = await adminLegalImprintFindMany(serverRuntime);

        // Assert
        const olderIdx = rows.findIndex((row) => row.imprintId === olderId);
        const newerIdx = rows.findIndex((row) => row.imprintId === newerId);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
        expect(rows[newerIdx]).toMatchObject({ imprintId: newerId, bodyDe: 'newer-body' });
    });
});
