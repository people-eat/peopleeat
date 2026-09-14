import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { cooks } from '../db/schema';
import type { CookCreate } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookStripeStatusSync } from './cookStripeStatusSync';

async function setupCook(overrides: Partial<CookCreate> = {}) {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId, ...overrides });
    return setup;
}

describe('cookStripeStatusSync', () => {
    it('no-ops successfully when the cook has no Stripe account', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({ stripeAccountId: null });

        // Act
        const result = await cookStripeStatusSync(cookMutationParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ success: true, referenceId: user.userId });
        expect(serverRuntime.stripe.accountOnboardingCompletedCheck).not.toHaveBeenCalled();
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('marks the account active when Stripe reports onboarding complete', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            stripeAccountId: 'acct_sync',
            stripeAccountActive: false,
            stripeAccountActiveWasReset: false,
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingCompletedCheck).mockResolvedValue(true);

        // Act
        const result = await cookStripeStatusSync(cookMutationParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ success: true, referenceId: user.userId });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.stripeAccountActive).toBe(true);
        expect(row!.stripeAccountActiveWasReset).toBe(false);
        expect(serverRuntime.stripe.accountOnboardingCompletedCheck).toHaveBeenCalledWith('acct_sync');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('sets stripeAccountActiveWasReset when a previously active account becomes incomplete', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            stripeAccountId: 'acct_sync',
            stripeAccountActive: true,
            stripeAccountActiveWasReset: false,
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingCompletedCheck).mockResolvedValue(false);

        // Act
        await cookStripeStatusSync(cookMutationParent(user.userId), requestingSession, serverRuntime);

        // Assert
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.stripeAccountActive).toBe(false);
        expect(row!.stripeAccountActiveWasReset).toBe(true);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('keeps stripeAccountActiveWasReset true when still incomplete after a prior reset', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            stripeAccountId: 'acct_sync',
            stripeAccountActive: false,
            stripeAccountActiveWasReset: true,
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingCompletedCheck).mockResolvedValue(false);

        // Act
        await cookStripeStatusSync(cookMutationParent(user.userId), requestingSession, serverRuntime);

        // Assert
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.stripeAccountActive).toBe(false);
        expect(row!.stripeAccountActiveWasReset).toBe(true);
    });

    it('clears the reset flag when onboarding completes again', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            stripeAccountId: 'acct_sync',
            stripeAccountActive: false,
            stripeAccountActiveWasReset: true,
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingCompletedCheck).mockResolvedValue(true);

        // Act
        await cookStripeStatusSync(cookMutationParent(user.userId), requestingSession, serverRuntime);

        // Assert
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.stripeAccountActive).toBe(true);
        expect(row!.stripeAccountActiveWasReset).toBe(false);
    });

    it('logs and rethrows when Stripe status check fails', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            stripeAccountId: 'acct_sync',
            stripeAccountActive: false,
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingCompletedCheck).mockRejectedValue(new Error('stripe boom'));

        // Act + Assert
        await expect(cookStripeStatusSync(cookMutationParent(user.userId), requestingSession, serverRuntime)).rejects.toThrow(
            /stripe boom/,
        );

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /stripe boom/.test(row.message))).toBe(true);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
