import { describe, expect, it, vi } from 'vitest';

import { cooks } from '../db/schema';
import type { CookCreate } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookStripeDashboardUrlCreate } from './cookStripeDashboardUrlCreate';

async function setupCook(overrides: Partial<CookCreate> = {}) {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId, ...overrides });
    return setup;
}

describe('cookStripeDashboardUrlCreate', () => {
    it('returns a dashboard url when the cook has an active Stripe account', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            stripeAccountId: 'acct_active',
            stripeAccountActive: true,
        });
        vi.mocked(serverRuntime.stripe.accountDashboardUrlCreate).mockResolvedValue(
            new URL('https://connect.stripe.com/express/acct_active'),
        );

        // Act
        const result = await cookStripeDashboardUrlCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ url: 'https://connect.stripe.com/express/acct_active' });
        expect(serverRuntime.stripe.accountDashboardUrlCreate).toHaveBeenCalledWith('acct_active');
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('returns null when the cook has no Stripe account id', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            stripeAccountId: null,
            stripeAccountActive: false,
        });

        // Act
        const result = await cookStripeDashboardUrlCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ url: null });
        expect(serverRuntime.stripe.accountDashboardUrlCreate).not.toHaveBeenCalled();
    });

    it('returns null when the Stripe account exists but is not active', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            stripeAccountId: 'acct_inactive',
            stripeAccountActive: false,
        });

        // Act
        const result = await cookStripeDashboardUrlCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ url: null });
        expect(serverRuntime.stripe.accountDashboardUrlCreate).not.toHaveBeenCalled();
    });

    it('logs and rethrows when Stripe dashboard url creation fails', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            stripeAccountId: 'acct_active',
            stripeAccountActive: true,
        });
        vi.mocked(serverRuntime.stripe.accountDashboardUrlCreate).mockRejectedValue(new Error('stripe down'));

        // Act + Assert
        await expect(cookStripeDashboardUrlCreate(cookMutationParent(user.userId), requestingSession, serverRuntime)).rejects.toThrow(
            /stripe down/,
        );

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /stripe down/.test(row.message))).toBe(true);
    });
});
