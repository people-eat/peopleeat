import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { giftCardCreate } from '../../commands/giftCardCreate';
import { giftCardPay } from '../../commands/giftCardPay';
import { giftCards } from '../../db/schema';
import { commandSetup, testDb, userMutationParent } from '../../test/commandTestUtils';
import { giftCardPreparedExpire } from './giftCardPreparedExpire';

const createInput = {
    balanceCents: 10_000,
    occasion: 'Dankeschön',
    recipientName: 'Max Mustermann',
    message: 'Danke!',
    locale: 'de' as const,
    recaptchaToken: 'token',
};

const invoiceAddress = {
    companyName: '',
    firstName: 'Max',
    lastName: 'Mustermann',
    country: 'DE',
    city: 'Hamburg',
    postalCode: '20095',
    line1: 'Jungfernstieg 1',
    line2: '',
};

describe('giftCardPreparedExpire', () => {
    it('cancels the PaymentIntent, deletes PREPARED rows, and publishes updates', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_expire_1',
            clientSecret: 'pi_expire_1_secret',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue('job_expire_1');
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(false);
        vi.mocked(serverRuntime.stripe.paymentIntentCancel).mockResolvedValue(undefined);

        const created = await giftCardCreate(userMutationParent(user.userId), { input: createInput }, requestingSession, serverRuntime);

        // Act
        await giftCardPreparedExpire.handler({
            data: { giftCardId: created.referenceId! },
            serverRuntime,
        });

        // Assert
        expect(serverRuntime.stripe.paymentIntentSucceededCheck).toHaveBeenCalledWith('pi_expire_1');
        expect(serverRuntime.stripe.paymentIntentCancel).toHaveBeenCalledWith('pi_expire_1');
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({
            sessionId: requestingSession.sessionId,
        });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();

        const rows = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, created.referenceId!));
        expect(rows).toHaveLength(0);
    });

    it('no-ops when the gift card is already PAYED', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_expire_2',
            clientSecret: 'pi_expire_2_secret',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue('job_expire_2');
        vi.mocked(serverRuntime.jobs.cancel).mockResolvedValue(undefined);
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(serverRuntime.stripe.customerUpdate).mockResolvedValue(undefined);
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });
        vi.mocked(serverRuntime.browser.capturePdf).mockResolvedValue(Buffer.from('%PDF-receipt'));

        const created = await giftCardCreate(userMutationParent(user.userId), { input: createInput }, requestingSession, serverRuntime);
        await giftCardPay(
            userMutationParent(user.userId),
            { input: { giftCardId: created.referenceId!, invoiceAddress } },
            requestingSession,
            serverRuntime,
        );
        vi.mocked(serverRuntime.stripe.paymentIntentCancel).mockClear();
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockClear();

        // Act
        await giftCardPreparedExpire.handler({
            data: { giftCardId: created.referenceId! },
            serverRuntime,
        });

        // Assert
        expect(serverRuntime.stripe.paymentIntentCancel).not.toHaveBeenCalled();
        const [row] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, created.referenceId!));
        expect(row?.paymentStatus).toBe('PAYED');
    });

    it('keeps the PREPARED row when the PaymentIntent already succeeded', async () => {
        // Arrange — paid in Stripe but giftCardPay never ran
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_expire_paid',
            clientSecret: 'pi_expire_paid_secret',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue('job_expire_paid');
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);

        const created = await giftCardCreate(userMutationParent(user.userId), { input: createInput }, requestingSession, serverRuntime);
        vi.mocked(serverRuntime.stripe.paymentIntentCancel).mockClear();

        // Act
        await giftCardPreparedExpire.handler({
            data: { giftCardId: created.referenceId! },
            serverRuntime,
        });

        // Assert
        expect(serverRuntime.stripe.paymentIntentCancel).not.toHaveBeenCalled();
        const [row] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, created.referenceId!));
        expect(row?.paymentStatus).toBe('PREPARED');
    });
});
