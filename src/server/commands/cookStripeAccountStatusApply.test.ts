import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks } from '../db/schema';
import type { CookCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookStripeAccountStatusApply } from './cookStripeAccountStatusApply';

async function setupCook(overrides: Partial<CookCreate> = {}) {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId, ...overrides });
    return setup;
}

describe('cookStripeAccountStatusApply', () => {
    it('returns false when no cook matches the Stripe account id', async () => {
        const { serverRuntime } = await commandSetup.withUser({ firstName: 'a', lastName: 'b' });

        const applied = await cookStripeAccountStatusApply({ stripeAccountId: `acct_${idCreate()}` }, serverRuntime);

        expect(applied).toBe(false);
        expect(serverRuntime.stripe.accountOnboardingCompletedCheck).not.toHaveBeenCalled();
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('marks the account active when Stripe reports onboarding complete', async () => {
        const stripeAccountId = `acct_${idCreate()}`;
        const { serverRuntime, user } = await setupCook({
            stripeAccountId,
            stripeAccountActive: false,
            stripeAccountActiveWasReset: false,
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingCompletedCheck).mockResolvedValue(true);

        const applied = await cookStripeAccountStatusApply({ stripeAccountId }, serverRuntime);

        expect(applied).toBe(true);
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.stripeAccountActive).toBe(true);
        expect(row!.stripeAccountActiveWasReset).toBe(false);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('sets stripeAccountActiveWasReset when a previously active account becomes incomplete', async () => {
        const stripeAccountId = `acct_${idCreate()}`;
        const { serverRuntime, user } = await setupCook({
            stripeAccountId,
            stripeAccountActive: true,
            stripeAccountActiveWasReset: false,
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingCompletedCheck).mockResolvedValue(false);

        await cookStripeAccountStatusApply({ stripeAccountId }, serverRuntime);

        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.stripeAccountActive).toBe(false);
        expect(row!.stripeAccountActiveWasReset).toBe(true);
    });
});
