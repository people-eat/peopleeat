import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { giftCards, sessions } from '../db/schema';
import type * as EnvironmentVariablesCreateModule from '../env/environmentVariablesCreate';
import { environmentVariablesTestSource } from '../env/environmentVariablesTestSource';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import * as verifyRecaptchaV3Module from '../utils/verifyRecaptchaV3';
import { giftCardCreate } from './giftCardCreate';

vi.mock('../env/environmentVariablesCreate', async (importOriginal) => {
    const actual = await importOriginal<typeof EnvironmentVariablesCreateModule>();
    const base = actual.environmentVariablesCreate(environmentVariablesTestSource());
    return {
        environmentVariablesCreate: actual.environmentVariablesCreate,
        environmentVariables: base,
    };
});

const baseInput = {
    balanceCents: 20_000,
    occasion: 'Geburtstag',
    recipientName: 'Ada Lovelace',
    message: 'Guten Appetit!',
    locale: 'de' as const,
    recaptchaToken: 'token',
};

describe('giftCardCreate', () => {
    beforeEach(() => {
        vi.spyOn(verifyRecaptchaV3Module, 'verifyRecaptchaV3').mockResolvedValue({
            ok: true,
            score: 0.9,
        });
    });

    it('creates a PREPARED gift card, enqueues cleanup after insert, and publishes sessionUpdates', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_test_1',
            clientSecret: 'pi_test_1_secret',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue('job_cleanup_1');

        // Act
        const result = await giftCardCreate(userMutationParent(user.userId), { input: baseInput }, requestingSession, serverRuntime);

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        expect(verifyRecaptchaV3Module.verifyRecaptchaV3).toHaveBeenCalledOnce();
        expect(serverRuntime.stripe.paymentIntentCreate).toHaveBeenCalledOnce();
        expect(serverRuntime.stripe.paymentIntentCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                user: expect.objectContaining({ userId: user.userId, emailAddress: user.emailAddress }),
            }),
        );
        expect(serverRuntime.jobs.enqueue).toHaveBeenCalledOnce();
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({
            sessionId: requestingSession.sessionId,
        });
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith(userMutationParent(user.userId));
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalledOnce();

        const [row] = await testDb.select().from(giftCards).where(eq(giftCards.sessionId, requestingSession.sessionId));
        expect(row?.paymentStatus).toBe('PREPARED');
        expect(row?.balanceCents).toBe(20_000);
        expect(row?.paymentIntentId).toBe('pi_test_1');
        expect(row?.cleanupJobId).toBe('job_cleanup_1');
        expect(row?.buyerUserId).toBe(user.userId);
        expect(row?.buyerEmail).toBe(user.emailAddress);
        expect(row?.recipientName).toBe('Ada Lovelace');
        expect(row?.locale).toBe('de');
    });

    it('updates amount on an existing PREPARED card and reschedules cleanup', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_test_2',
            clientSecret: 'pi_test_2_secret',
        });
        vi.mocked(serverRuntime.stripe.paymentIntentAmountUpdate).mockResolvedValue({
            paymentIntentId: 'pi_test_2',
            clientSecret: 'pi_test_2_secret_updated',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValueOnce('job_1').mockResolvedValueOnce('job_2');
        vi.mocked(serverRuntime.jobs.cancel).mockResolvedValue(undefined);

        // Act
        await giftCardCreate(userMutationParent(user.userId), { input: baseInput }, requestingSession, serverRuntime);
        const result = await giftCardCreate(
            userMutationParent(user.userId),
            { input: { ...baseInput, balanceCents: 30_000, locale: 'en' } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(serverRuntime.stripe.paymentIntentAmountUpdate).toHaveBeenCalledWith('pi_test_2', 30_000);
        expect(serverRuntime.jobs.cancel).toHaveBeenCalledWith('gift-card-prepared-expire', 'job_1');

        const rows = await testDb.select().from(giftCards).where(eq(giftCards.sessionId, requestingSession.sessionId));
        expect(rows).toHaveLength(1);
        expect(rows[0]?.balanceCents).toBe(30_000);
        expect(rows[0]?.cleanupJobId).toBe('job_2');
        expect(rows[0]?.paymentClientSecret).toBe('pi_test_2_secret_updated');
        expect(rows[0]?.locale).toBe('en');
    });

    it('rejects balances below the minimum', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();

        // Act
        const result = await giftCardCreate(
            userMutationParent(user.userId),
            { input: { ...baseInput, balanceCents: 1000 } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.success).toBe(false);
        expect(serverRuntime.stripe.paymentIntentCreate).not.toHaveBeenCalled();
    });

    it('stores RECAPTCHA_FAILED on the session when captcha verification fails', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.spyOn(verifyRecaptchaV3Module, 'verifyRecaptchaV3').mockResolvedValue({
            ok: false,
            reason: 'low-score',
        });

        // Act
        const result = await giftCardCreate(userMutationParent(user.userId), { input: baseInput }, requestingSession, serverRuntime);

        // Assert
        expect(result.success).toBe(false);
        expect(serverRuntime.stripe.paymentIntentCreate).not.toHaveBeenCalled();
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({
            sessionId: requestingSession.sessionId,
        });
        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, requestingSession.sessionId));
        expect(session?.giftCardPurchaseError).toBe('RECAPTCHA_FAILED');
    });

    it('throws when jobs.enqueue returns null after the row is written', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_null_job',
            clientSecret: 'pi_null_job_secret',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue(null);

        // Act / Assert
        await expect(
            giftCardCreate(userMutationParent(user.userId), { input: baseInput }, requestingSession, serverRuntime),
        ).rejects.toThrow(/enqueue returned null/);

        const [row] = await testDb.select().from(giftCards).where(eq(giftCards.sessionId, requestingSession.sessionId));
        expect(row?.paymentStatus).toBe('PREPARED');
        expect(row?.cleanupJobId).toBeNull();
    });
});
