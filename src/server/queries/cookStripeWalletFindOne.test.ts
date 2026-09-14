import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cooks } from '../db/schema';
import type { CookCreate } from '../db/schema';
import { toGqlCook } from '../mappers/toGqlCook';
import { commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { cookStripeWalletFindOne } from './cookStripeWalletFindOne';

vi.mock('../utils/featureToggleIsEnabled', () => ({
    featureToggleIsEnabled: vi.fn(async () => false),
}));

async function setupCook(overrides: Partial<CookCreate> = {}) {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId, ...overrides });
    const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, setup.user.userId));
    return { ...setup, cook: toGqlCook(row!, 'ACTIVE') };
}

describe('cookStripeWalletFindOne', () => {
    beforeEach(() => {
        vi.mocked(featureToggleIsEnabled).mockReset();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(true);
    });

    it('returns null when the session does not own the cook', async () => {
        const owner = await setupCook({ stripeAccountId: 'acct_owned' });
        const other = await commandSetup.withUser();

        await expect(cookStripeWalletFindOne(owner.cook, other.requestingSession, other.serverRuntime)).resolves.toBeNull();
        expect(featureToggleIsEnabled).not.toHaveBeenCalled();
        expect(other.serverRuntime.stripe.accountBalanceFindOne).not.toHaveBeenCalled();
        expect(other.serverRuntime.stripe.accountBalanceTransactionsFindMany).not.toHaveBeenCalled();
    });

    it('returns null when COOK_WALLET_STRIPE_BALANCE is disabled', async () => {
        const { requestingSession, serverRuntime, cook } = await setupCook({ stripeAccountId: 'acct_wallet' });
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(false);

        await expect(cookStripeWalletFindOne(cook, requestingSession, serverRuntime)).resolves.toBeNull();
        expect(featureToggleIsEnabled).toHaveBeenCalledWith('COOK_WALLET_STRIPE_BALANCE', serverRuntime, cook.cookId);
        expect(serverRuntime.stripe.accountBalanceFindOne).not.toHaveBeenCalled();
    });

    it('returns null when the cook has no Stripe account id', async () => {
        const { requestingSession, serverRuntime, cook } = await setupCook({ stripeAccountId: null });

        await expect(cookStripeWalletFindOne(cook, requestingSession, serverRuntime)).resolves.toBeNull();
        expect(serverRuntime.stripe.accountBalanceFindOne).not.toHaveBeenCalled();
    });

    it('returns balance and transactions for the owning cook', async () => {
        const { requestingSession, serverRuntime, cook } = await setupCook({ stripeAccountId: 'acct_wallet' });
        const createdAt = new Date('2026-10-01T12:00:00.000Z');
        const availableOn = new Date('2026-10-03T12:00:00.000Z');
        vi.mocked(serverRuntime.stripe.accountBalanceFindOne).mockResolvedValue({
            availableCents: 12_500,
            pendingCents: 4_000,
        });
        vi.mocked(serverRuntime.stripe.accountBalanceTransactionsFindMany).mockResolvedValue([
            {
                id: 'txn_1',
                kind: 'PAYMENT',
                status: 'AVAILABLE',
                netCents: 12_500,
                createdAt,
                availableOn,
                description: 'Booking payout',
            },
        ]);

        const result = await cookStripeWalletFindOne(cook, requestingSession, serverRuntime);

        expect(featureToggleIsEnabled).toHaveBeenCalledWith('COOK_WALLET_STRIPE_BALANCE', serverRuntime, cook.cookId);
        expect(serverRuntime.stripe.accountBalanceFindOne).toHaveBeenCalledWith('acct_wallet');
        expect(serverRuntime.stripe.accountBalanceTransactionsFindMany).toHaveBeenCalledWith({
            accountId: 'acct_wallet',
            limit: 20,
        });
        expect(result).toEqual({
            availableCents: 12_500,
            pendingCents: 4_000,
            transactions: [
                {
                    balanceTransactionId: 'txn_1',
                    kind: 'PAYMENT',
                    status: 'AVAILABLE',
                    netCents: 12_500,
                    createdAt,
                    availableOn,
                    description: 'Booking payout',
                },
            ],
        });
    });

    it('returns null when Stripe retrieve fails', async () => {
        const { requestingSession, serverRuntime, cook } = await setupCook({ stripeAccountId: 'acct_fail' });
        vi.mocked(serverRuntime.stripe.accountBalanceFindOne).mockRejectedValue(new Error('stripe boom'));

        await expect(cookStripeWalletFindOne(cook, requestingSession, serverRuntime)).resolves.toBeNull();

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /stripe boom/.test(row.message))).toBe(true);
    });
});
