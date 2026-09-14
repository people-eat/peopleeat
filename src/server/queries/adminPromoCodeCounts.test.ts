import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { promoCodes } from '../db/schema';
import type { PromoCodeCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminPromoCodeCounts } from './adminPromoCodeCounts';

async function insertPromoCode(overrides: Partial<PromoCodeCreate> = {}) {
    await testDb.insert(promoCodes).values({
        promoCodeId: overrides.promoCodeId ?? idCreate(),
        redeemCode: overrides.redeemCode ?? `PROMO-${idCreate().slice(0, 8)}`,
        amountCents: overrides.amountCents ?? 1000,
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 86_400_000),
        ...overrides,
    });
}

describe('adminPromoCodeCounts', () => {
    it('returns one count per criterion in order', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const tokenA = `A${idCreate().slice(0, 6).toUpperCase()}`;
        const tokenB = `B${idCreate().slice(0, 6).toUpperCase()}`;
        await insertPromoCode({ redeemCode: `${tokenA}-1` });
        await insertPromoCode({ redeemCode: `${tokenA}-2` });
        await insertPromoCode({ redeemCode: `${tokenB}-1` });

        // Act
        const [countA, countB] = await adminPromoCodeCounts(
            {
                criteria: [{ searchText: tokenA }, { searchText: tokenB }],
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(countA).toBe(2);
        expect(countB).toBe(1);
    });

    it('counts rows matching searchText', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `CNT${idCreate().slice(0, 6).toUpperCase()}`;
        await insertPromoCode({ redeemCode: `${token}-A` });
        await insertPromoCode({ redeemCode: `${token}-B` });
        await insertPromoCode({ redeemCode: `OTHER-${idCreate().slice(0, 8)}` });

        // Act
        const [total] = await adminPromoCodeCounts({ criteria: [{ searchText: token }] }, requestingSession, serverRuntime);

        // Assert
        expect(total).toBe(2);
    });

    it('counts all promo codes when searchText is omitted', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        await insertPromoCode();

        // Act
        const [total] = await adminPromoCodeCounts({ criteria: [{}] }, requestingSession, serverRuntime);

        // Assert
        expect(total).toBeGreaterThanOrEqual(1);
    });

    it('rejects an empty criteria list', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act / Assert
        await expect(adminPromoCodeCounts({ criteria: [] }, requestingSession, serverRuntime)).rejects.toThrow(
            /criteria must not be empty/,
        );
    });
});
