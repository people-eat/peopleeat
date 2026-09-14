import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { promoCodes } from '../db/schema';
import type { PromoCodeCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminPromoCodeFindMany } from './adminPromoCodeFindMany';

async function insertPromoCode(overrides: Partial<PromoCodeCreate> = {}) {
    const promoCodeId = overrides.promoCodeId ?? idCreate();
    const [row] = await testDb
        .insert(promoCodes)
        .values({
            promoCodeId,
            redeemCode: `PROMO-${idCreate().slice(0, 8)}`,
            amountCents: 1000,
            expiresAt: new Date(Date.now() + 86_400_000),
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertPromoCode: no row');
    return row;
}

describe('adminPromoCodeFindMany', () => {
    it('returns seeded promo codes ordered by createdAt descending', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `ORD${idCreate().slice(0, 6).toUpperCase()}`;
        const older = await insertPromoCode({ redeemCode: `${token}-OLDER` });
        const newer = await insertPromoCode({ redeemCode: `${token}-NEWER` });

        // Act
        const rows = await adminPromoCodeFindMany(
            { criterion: { skip: 0, take: 100, searchText: token } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        const olderIdx = rows.findIndex((row) => row.promoCodeId === older.promoCodeId);
        const newerIdx = rows.findIndex((row) => row.promoCodeId === newer.promoCodeId);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
    });

    it('filters by searchText against redeemCode', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `SRC${idCreate().slice(0, 6).toUpperCase()}`;
        const match = await insertPromoCode({ redeemCode: `${token}-MATCH` });
        const miss = await insertPromoCode({ redeemCode: `MISS-${idCreate().slice(0, 8)}` });

        // Act
        const rows = await adminPromoCodeFindMany(
            { criterion: { skip: 0, take: 100, searchText: token } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.some((row) => row.promoCodeId === match.promoCodeId)).toBe(true);
        expect(rows.some((row) => row.promoCodeId === miss.promoCodeId)).toBe(false);
    });

    it('paginates with skip and take', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `PG${idCreate().slice(0, 6).toUpperCase()}`;
        await insertPromoCode({ redeemCode: `${token}-A` });
        await insertPromoCode({ redeemCode: `${token}-B` });
        await insertPromoCode({ redeemCode: `${token}-C` });

        // Act
        const page = await adminPromoCodeFindMany({ criterion: { skip: 0, take: 2, searchText: token } }, requestingSession, serverRuntime);
        const next = await adminPromoCodeFindMany({ criterion: { skip: 2, take: 2, searchText: token } }, requestingSession, serverRuntime);

        // Assert
        expect(page).toHaveLength(2);
        expect(next).toHaveLength(1);
        expect(new Set([...page, ...next].map((row) => row.promoCodeId)).size).toBe(3);
    });
});
