import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { PartnerCreate } from '../db/schema';
import { partners } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { publicPartnerFindMany } from './publicPartnerFindMany';
import { publicPartnerFindOneByPathName } from './publicPartnerFindOneByPathName';

async function insertPartner(overrides: Partial<PartnerCreate> = {}) {
    const partnerId = overrides.partnerId ?? idCreate();
    const [row] = await testDb
        .insert(partners)
        .values({
            partnerId,
            pathName: `partner-${partnerId}`,
            name: 'Acme',
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertPartner: insert returned no rows');
    return row;
}

describe('publicPartnerFindMany', () => {
    it('includes published partners and excludes unpublished ones', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const published = await insertPartner({ name: 'published-partner', publishedAt: new Date('2024-01-01T00:00:00.000Z') });
        const unpublished = await insertPartner({ name: 'draft-partner', publishedAt: null });

        // Act
        const rows = await publicPartnerFindMany(serverRuntime);

        // Assert
        expect(rows.some((row) => row.partnerId === published.partnerId)).toBe(true);
        expect(rows.some((row) => row.partnerId === unpublished.partnerId)).toBe(false);
    });
});

describe('publicPartnerFindOneByPathName', () => {
    it('returns the published partner by its current path name', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const pathName = `published-partner-${idCreate()}`;
        const partner = await insertPartner({
            pathName,
            name: 'published-partner',
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        });

        // Act
        const row = await publicPartnerFindOneByPathName({ pathName }, serverRuntime);

        // Assert
        expect(row).toMatchObject({ partnerId: partner.partnerId, pathName });
    });

    it('returns null for an unpublished partner path name', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const pathName = `draft-partner-${idCreate()}`;
        await insertPartner({ pathName, name: 'draft-partner', publishedAt: null });

        // Act / Assert
        await expect(publicPartnerFindOneByPathName({ pathName }, serverRuntime)).resolves.toBeNull();
    });

    it('returns null when the path name does not match any partner', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(publicPartnerFindOneByPathName({ pathName: `no-such-path-${idCreate()}` }, serverRuntime)).resolves.toBeNull();
    });
});
