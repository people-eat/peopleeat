import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { cooks } from '../db/schema';
import type { CookCreate, UserCreate } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { cookStripeOnboardingStart } from './cookStripeOnboardingStart';

const berlin = {
    displayText: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: 'Street 1',
    addressLine2: 'Apt 2',
    city: 'Berlin',
    postCode: '10115',
    state: 'BE',
    country: 'DE',
};

async function setupCook(
    overrides: Partial<CookCreate> = {},
    userOverrides: Partial<Pick<UserCreate, 'firstName' | 'lastName' | 'phoneNumber' | 'birthDate'>> = {},
) {
    const setup = await commandSetup.withUser({
        firstName: userOverrides.firstName ?? 'Chef',
        lastName: userOverrides.lastName ?? 'Stripe',
        ...userOverrides,
    });
    await testDb.insert(cooks).values({ cookId: setup.user.userId, ...overrides });
    return setup;
}

const urls = {
    returnUrl: 'https://peopleeat.com/profile/wallet?return=1',
    refreshUrl: 'https://peopleeat.com/profile/wallet?refresh=1',
};

describe('cookStripeOnboardingStart', () => {
    it('returns NOT_APPROVED when the cook is not admin-approved', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({ isApprovedByAdmin: false });

        // Act
        const result = await cookStripeOnboardingStart(cookMutationParent(user.userId), urls, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ kind: 'NOT_APPROVED', url: null });
        expect(serverRuntime.stripe.accountCreate).not.toHaveBeenCalled();
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('creates a Stripe account, persists it inactive, publishes, and returns ONBOARDING_URL', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            isApprovedByAdmin: true,
            stripeAccountId: null,
        });
        vi.mocked(serverRuntime.stripe.accountCreate).mockResolvedValue({
            kind: 'onboardingRequired',
            accountId: 'acct_new',
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingUrlCreate).mockResolvedValue(new URL('https://connect.stripe.com/setup/acct_new'));

        // Act
        const result = await cookStripeOnboardingStart(cookMutationParent(user.userId), urls, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ kind: 'ONBOARDING_URL', url: 'https://connect.stripe.com/setup/acct_new' });
        expect(serverRuntime.stripe.accountCreate).toHaveBeenCalledWith({
            cookId: user.userId,
            emailAddress: user.emailAddress,
            firstName: 'Chef',
            lastName: 'Stripe',
            existingAccountId: undefined,
        });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.stripeAccountId).toBe('acct_new');
        expect(row!.stripeAccountActive).toBe(false);
        expect(row!.stripeAccountActiveWasReset).toBe(false);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
        expect(serverRuntime.stripe.accountOnboardingUrlCreate).toHaveBeenCalledWith(
            'acct_new',
            new URL(urls.refreshUrl),
            new URL(urls.returnUrl),
        );
    });

    it('prefills phone, date of birth, and travel-origin address when present', async () => {
        // Arrange — unique phone avoids Users_phoneNumber_uidx collisions across workers.
        const phoneNumber = phoneNumberCreate();
        const { serverRuntime, requestingSession, user } = await setupCook(
            {
                isApprovedByAdmin: true,
                stripeAccountId: null,
                exactTravelOriginAddress: berlin,
            },
            {
                phoneNumber,
                birthDate: '1990-05-15',
            },
        );
        vi.mocked(serverRuntime.stripe.accountCreate).mockResolvedValue({
            kind: 'onboardingRequired',
            accountId: 'acct_prefill',
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingUrlCreate).mockResolvedValue(
            new URL('https://connect.stripe.com/setup/acct_prefill'),
        );

        // Act
        const result = await cookStripeOnboardingStart(cookMutationParent(user.userId), urls, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ kind: 'ONBOARDING_URL', url: 'https://connect.stripe.com/setup/acct_prefill' });
        expect(serverRuntime.stripe.accountCreate).toHaveBeenCalledWith({
            cookId: user.userId,
            emailAddress: user.emailAddress,
            firstName: 'Chef',
            lastName: 'Stripe',
            phoneNumber,
            dateOfBirth: { day: 15, month: 5, year: 1990 },
            address: {
                country: 'DE',
                city: 'Berlin',
                postCode: '10115',
                line1: 'Street 1',
                line2: 'Apt 2',
            },
            existingAccountId: undefined,
        });
    });

    it('omits incomplete travel-origin address from Stripe prefill', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            isApprovedByAdmin: true,
            stripeAccountId: null,
            exactTravelOriginAddress: { ...berlin, addressLine1: '', city: '' },
        });
        vi.mocked(serverRuntime.stripe.accountCreate).mockResolvedValue({
            kind: 'onboardingRequired',
            accountId: 'acct_no_address',
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingUrlCreate).mockResolvedValue(
            new URL('https://connect.stripe.com/setup/acct_no_address'),
        );

        // Act
        await cookStripeOnboardingStart(cookMutationParent(user.userId), urls, requestingSession, serverRuntime);

        // Assert
        expect(serverRuntime.stripe.accountCreate).toHaveBeenCalledWith({
            cookId: user.userId,
            emailAddress: user.emailAddress,
            firstName: 'Chef',
            lastName: 'Stripe',
            existingAccountId: undefined,
        });
    });

    it('returns ALREADY_COMPLETE when accountCreate reports onboardingComplete', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            isApprovedByAdmin: true,
            stripeAccountId: null,
        });
        vi.mocked(serverRuntime.stripe.accountCreate).mockResolvedValue({
            kind: 'onboardingComplete',
            accountId: 'acct_done',
        });

        // Act
        const result = await cookStripeOnboardingStart(cookMutationParent(user.userId), urls, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ kind: 'ALREADY_COMPLETE', url: null });
        const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(row!.stripeAccountId).toBe('acct_done');
        expect(row!.stripeAccountActive).toBe(true);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
        expect(serverRuntime.stripe.accountOnboardingUrlCreate).not.toHaveBeenCalled();
    });

    it('returns ALREADY_COMPLETE when an existing active account has finished onboarding', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            isApprovedByAdmin: true,
            stripeAccountId: 'acct_existing',
            stripeAccountActive: true,
            stripeAccountActiveWasReset: false,
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingCompletedCheck).mockResolvedValue(true);

        // Act
        const result = await cookStripeOnboardingStart(cookMutationParent(user.userId), urls, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ kind: 'ALREADY_COMPLETE', url: null });
        expect(serverRuntime.stripe.accountCreate).not.toHaveBeenCalled();
        expect(serverRuntime.stripe.accountOnboardingCompletedCheck).toHaveBeenCalledWith('acct_existing');
        expect(serverRuntime.stripe.accountOnboardingUrlCreate).not.toHaveBeenCalled();
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('returns ONBOARDING_URL for an existing inactive account without creating a new one', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            isApprovedByAdmin: true,
            stripeAccountId: 'acct_existing',
            stripeAccountActive: false,
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingUrlCreate).mockResolvedValue(
            new URL('https://connect.stripe.com/setup/acct_existing'),
        );

        // Act
        const result = await cookStripeOnboardingStart(cookMutationParent(user.userId), urls, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({
            kind: 'ONBOARDING_URL',
            url: 'https://connect.stripe.com/setup/acct_existing',
        });
        expect(serverRuntime.stripe.accountCreate).not.toHaveBeenCalled();
        expect(serverRuntime.stripe.accountOnboardingUrlCreate).toHaveBeenCalledWith(
            'acct_existing',
            new URL(urls.refreshUrl),
            new URL(urls.returnUrl),
        );
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('still issues an onboarding url when an active account is incomplete', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook({
            isApprovedByAdmin: true,
            stripeAccountId: 'acct_existing',
            stripeAccountActive: true,
            stripeAccountActiveWasReset: false,
        });
        vi.mocked(serverRuntime.stripe.accountOnboardingCompletedCheck).mockResolvedValue(false);
        vi.mocked(serverRuntime.stripe.accountOnboardingUrlCreate).mockResolvedValue(new URL('https://connect.stripe.com/setup/retry'));

        // Act
        const result = await cookStripeOnboardingStart(cookMutationParent(user.userId), urls, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ kind: 'ONBOARDING_URL', url: 'https://connect.stripe.com/setup/retry' });
        expect(serverRuntime.stripe.accountOnboardingUrlCreate).toHaveBeenCalled();
    });

    it('rejects when the cook row is missing and logs', async () => {
        // Arrange — user without cooks row.
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'No', lastName: 'Cook' });

        // Act + Assert
        await expect(cookStripeOnboardingStart(cookMutationParent(user.userId), urls, requestingSession, serverRuntime)).rejects.toThrow(
            /cook not found/,
        );

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /cook not found/.test(row.message))).toBe(true);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
