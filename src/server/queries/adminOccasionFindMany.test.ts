import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { OccasionCreate } from '../db/schema';
import { occasions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminOccasionFindMany } from './adminOccasionFindMany';
import { adminOccasionFindOne } from './adminOccasionFindOne';

async function insertOccasion(overrides: Partial<OccasionCreate> = {}) {
    const occasionId = overrides.occasionId ?? idCreate();
    const [row] = await testDb
        .insert(occasions)
        .values({
            occasionId,
            pathName: `occasion-${occasionId}`,
            name: 'Geburtstag',
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertOccasion: insert returned no rows');
    return row;
}

describe('adminOccasionFindMany', () => {
    it('returns seeded occasions ordered by updatedAt descending', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const older = await insertOccasion({ name: 'older-occasion', updatedAt: new Date('2024-01-01T00:00:00.000Z') });
        const newer = await insertOccasion({ name: 'newer-occasion', updatedAt: new Date('2024-06-01T00:00:00.000Z') });

        // Act
        const rows = await adminOccasionFindMany(serverRuntime);

        // Assert
        const olderIdx = rows.findIndex((row) => row.occasionId === older.occasionId);
        const newerIdx = rows.findIndex((row) => row.occasionId === newer.occasionId);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
        expect(rows[newerIdx]).toMatchObject({ occasionId: newer.occasionId, name: 'newer-occasion' });
    });
});

describe('adminOccasionFindOne', () => {
    it('returns the mapped occasion row', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const occasion = await insertOccasion({ name: 'detail-occasion' });

        // Act
        const row = await adminOccasionFindOne({ occasionId: occasion.occasionId }, serverRuntime);

        // Assert
        expect(row).toMatchObject({
            occasionId: occasion.occasionId,
            pathName: occasion.pathName,
            name: 'detail-occasion',
        });
    });

    it('returns null when the occasion id is unknown', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(adminOccasionFindOne({ occasionId: idCreate() }, serverRuntime)).resolves.toBeNull();
    });
});
