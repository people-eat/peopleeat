import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { occasionFormatsSectionEmpty } from '../../shared/occasionFormatsSection';
import type { OccasionCreate } from '../db/schema';
import { occasions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { publicOccasionFindMany } from './publicOccasionFindMany';
import { publicOccasionFindOneByPathName } from './publicOccasionFindOneByPathName';

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

describe('publicOccasionFindMany', () => {
    it('includes published occasions and excludes unpublished ones', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const published = await insertOccasion({ name: 'published-occasion', publishedAt: new Date('2024-01-01T00:00:00.000Z') });
        const unpublished = await insertOccasion({ name: 'draft-occasion', publishedAt: null });

        // Act
        const rows = await publicOccasionFindMany(serverRuntime);

        // Assert
        expect(rows.some((row) => row.occasionId === published.occasionId)).toBe(true);
        expect(rows.some((row) => row.occasionId === unpublished.occasionId)).toBe(false);
    });
});

describe('publicOccasionFindOneByPathName', () => {
    it('returns the published occasion by its current path name', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const pathName = `published-occasion-${idCreate()}`;
        const occasion = await insertOccasion({
            pathName,
            name: 'published-occasion',
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        });

        // Act
        const row = await publicOccasionFindOneByPathName({ pathName }, serverRuntime);

        // Assert
        expect(row).toMatchObject({ occasionId: occasion.occasionId, pathName });
    });

    it('returns the published occasion by a previously used path name', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const previousPathName = `legacy-occasion-${idCreate()}`;
        const occasion = await insertOccasion({
            previousPathNames: [previousPathName],
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        });

        // Act
        const row = await publicOccasionFindOneByPathName({ pathName: previousPathName }, serverRuntime);

        // Assert
        expect(row).toMatchObject({ occasionId: occasion.occasionId, pathName: occasion.pathName });
    });

    it('returns null for an unpublished occasion path name', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const pathName = `draft-occasion-${idCreate()}`;
        await insertOccasion({ pathName, name: 'draft-occasion', publishedAt: null });

        // Act / Assert
        await expect(publicOccasionFindOneByPathName({ pathName }, serverRuntime)).resolves.toBeNull();
    });

    it('returns null when the path name does not match any occasion', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(publicOccasionFindOneByPathName({ pathName: `no-such-path-${idCreate()}` }, serverRuntime)).resolves.toBeNull();
    });

    it('maps formatsSection card image URLs from file upload ids', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const pathName = `formats-occasion-${idCreate()}`;
        const imageFileUploadId = idCreate();
        const formatsSection = occasionFormatsSectionEmpty();
        formatsSection.titleDe = 'Formate';
        formatsSection.cards[0].titleDe = 'Seated Dinner';
        formatsSection.cards[0].imageFileUploadId = imageFileUploadId;
        await insertOccasion({
            pathName,
            formatsSection,
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        });

        // Act
        const row = await publicOccasionFindOneByPathName({ pathName }, serverRuntime);

        // Assert
        expect(row?.formatsSection.titleDe).toBe('Formate');
        expect(row?.formatsSection.cards[0]!.imageFileUploadId).toBe(imageFileUploadId);
        expect(row?.formatsSection.cards[0]!.imageUrl).toBe(`/api/file-uploads/${imageFileUploadId}`);
        expect(row?.formatsSection.cards[1]!.imageUrl).toBeNull();
    });
});
