import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { PartnerCreate } from '../db/schema';
import { partners } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminPartnerFindMany } from './adminPartnerFindMany';
import { adminPartnerFindOne } from './adminPartnerFindOne';

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

describe('adminPartnerFindMany', () => {
    it('returns seeded partners ordered by updatedAt descending', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const older = await insertPartner({ name: 'older-partner', updatedAt: new Date('2024-01-01T00:00:00.000Z') });
        const newer = await insertPartner({ name: 'newer-partner', updatedAt: new Date('2024-06-01T00:00:00.000Z') });

        // Act
        const rows = await adminPartnerFindMany(serverRuntime);

        // Assert
        const olderIdx = rows.findIndex((row) => row.partnerId === older.partnerId);
        const newerIdx = rows.findIndex((row) => row.partnerId === newer.partnerId);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
        expect(rows[newerIdx]).toMatchObject({ partnerId: newer.partnerId, name: 'newer-partner' });
    });
});

describe('adminPartnerFindOne', () => {
    it('returns the mapped partner row', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const partner = await insertPartner({ name: 'detail-partner' });

        // Act
        const row = await adminPartnerFindOne({ partnerId: partner.partnerId }, serverRuntime);

        // Assert
        expect(row).toMatchObject({
            partnerId: partner.partnerId,
            pathName: partner.pathName,
            name: 'detail-partner',
        });
    });

    it('returns null when the partner id is unknown', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(adminPartnerFindOne({ partnerId: idCreate() }, serverRuntime)).resolves.toBeNull();
    });
});
