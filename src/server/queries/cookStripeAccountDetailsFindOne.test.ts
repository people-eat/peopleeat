import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { cooks } from '../db/schema';
import type { CookCreate } from '../db/schema';
import { toGqlCook } from '../mappers/toGqlCook';
import { commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookStripeAccountDetailsFindOne } from './cookStripeAccountDetailsFindOne';

async function setupCook(overrides: Partial<CookCreate> = {}) {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId, ...overrides });
    const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, setup.user.userId));
    return { ...setup, cook: toGqlCook(row!, 'ACTIVE') };
}

describe('cookStripeAccountDetailsFindOne', () => {
    it('returns null when the session does not own the cook', async () => {
        const owner = await setupCook({ stripeAccountId: 'acct_owned' });
        const other = await commandSetup.withUser();

        await expect(cookStripeAccountDetailsFindOne(owner.cook, other.requestingSession, other.serverRuntime)).resolves.toBeNull();
        expect(other.serverRuntime.stripe.accountRequirementsFindOne).not.toHaveBeenCalled();
    });

    it('returns null when the cook has no Stripe account id', async () => {
        const { requestingSession, serverRuntime, cook } = await setupCook({ stripeAccountId: null });

        await expect(cookStripeAccountDetailsFindOne(cook, requestingSession, serverRuntime)).resolves.toBeNull();
        expect(serverRuntime.stripe.accountRequirementsFindOne).not.toHaveBeenCalled();
    });

    it('returns mapped requirements for the owning cook', async () => {
        const { requestingSession, serverRuntime, cook } = await setupCook({ stripeAccountId: 'acct_req' });
        vi.mocked(serverRuntime.stripe.accountRequirementsFindOne).mockResolvedValue({
            detailsSubmitted: true,
            chargesEnabled: false,
            payoutsEnabled: false,
            disabledReason: 'PAST_DUE',
            currentlyDue: ['IDENTITY_VERIFICATION', 'BANK_ACCOUNT'],
            pastDue: ['IDENTITY_VERIFICATION'],
            pendingVerification: [],
        });

        const result = await cookStripeAccountDetailsFindOne(cook, requestingSession, serverRuntime);

        expect(serverRuntime.stripe.accountRequirementsFindOne).toHaveBeenCalledWith('acct_req');
        expect(result).toEqual({
            detailsSubmitted: true,
            chargesEnabled: false,
            payoutsEnabled: false,
            disabledReason: 'PAST_DUE',
            currentlyDue: ['IDENTITY_VERIFICATION', 'BANK_ACCOUNT'],
            pastDue: ['IDENTITY_VERIFICATION'],
            pendingVerification: [],
        });
    });

    it('returns null when Stripe retrieve fails', async () => {
        const { requestingSession, serverRuntime, cook } = await setupCook({ stripeAccountId: 'acct_fail' });
        vi.mocked(serverRuntime.stripe.accountRequirementsFindOne).mockRejectedValue(new Error('stripe boom'));

        await expect(cookStripeAccountDetailsFindOne(cook, requestingSession, serverRuntime)).resolves.toBeNull();

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /stripe boom/.test(row.message))).toBe(true);
    });
});
