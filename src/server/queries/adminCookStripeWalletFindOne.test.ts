import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { cooks } from '../db/schema';
import type { CookCreate } from '../db/schema';
import { toGqlAdminCook } from '../mappers/toGqlAdminCook';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { adminCookStripeWalletFindOne } from './adminCookStripeWalletFindOne';

vi.mock('../utils/featureToggleIsEnabled', () => ({
    featureToggleIsEnabled: vi.fn(async () => false),
}));

async function setupCook(overrides: Partial<CookCreate> = {}) {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId, ...overrides });
    const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, setup.user.userId));
    return { ...setup, cook: toGqlAdminCook(row!, 'ACTIVE') };
}

describe('adminCookStripeWalletFindOne', () => {
    it('loads balance without COOK_WALLET_STRIPE_BALANCE and without cook session ownership', async () => {
        // Arrange
        const owner = await setupCook({ stripeAccountId: 'acct_admin_wallet' });
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });
        vi.mocked(admin.serverRuntime.stripe.accountBalanceFindOne).mockResolvedValue({
            availableCents: 5_000,
            pendingCents: 1_000,
        });
        vi.mocked(admin.serverRuntime.stripe.accountBalanceTransactionsFindMany).mockResolvedValue([]);

        // Act
        const result = await adminCookStripeWalletFindOne(owner.cook, admin.requestingSession, admin.serverRuntime);

        // Assert
        expect(featureToggleIsEnabled).not.toHaveBeenCalled();
        expect(admin.serverRuntime.stripe.accountBalanceFindOne).toHaveBeenCalledWith('acct_admin_wallet');
        expect(result).toEqual({
            availableCents: 5_000,
            pendingCents: 1_000,
            transactions: [],
        });
    });
});
