import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { giftCards } from '../db/schema';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { giftCardCreate } from './giftCardCreate';
import { giftCardPay } from './giftCardPay';

const createInput = {
    balanceCents: 15_000,
    occasion: 'Hochzeit',
    recipientName: 'Grace Hopper',
    message: 'Cheers!',
    locale: 'en' as const,
    recaptchaToken: 'token',
};

const invoiceAddress = {
    companyName: '',
    firstName: 'Buyer',
    lastName: 'Person',
    country: 'DE',
    city: 'Berlin',
    postalCode: '10115',
    line1: 'Musterstraße 1',
    line2: '',
};

describe('giftCardPay', () => {
    it('marks the card PAYED, cancels cleanup, emails with persisted locale, and publishes', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_pay_1',
            clientSecret: 'pi_pay_1_secret',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue('job_pay_1');
        vi.mocked(serverRuntime.jobs.cancel).mockResolvedValue(undefined);
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(serverRuntime.stripe.customerUpdate).mockResolvedValue(undefined);
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });
        vi.mocked(serverRuntime.browser.capturePdf).mockResolvedValue(Buffer.from('%PDF-receipt'));

        const created = await giftCardCreate(userMutationParent(user.userId), { input: createInput }, requestingSession, serverRuntime);

        // Act
        const result = await giftCardPay(
            userMutationParent(user.userId),
            { input: { giftCardId: created.referenceId!, invoiceAddress } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(serverRuntime.jobs.cancel).toHaveBeenCalledWith('gift-card-prepared-expire', 'job_pay_1');
        expect(serverRuntime.browser.capturePdf).toHaveBeenCalledTimes(2);
        expect(serverRuntime.email.send).toHaveBeenCalledOnce();
        const emailCall = vi.mocked(serverRuntime.email.send).mock.calls[0]?.[0];
        expect(emailCall?.to).toBe(user.emailAddress);
        expect(emailCall?.subject).toBe('Your peopleeat gift card');
        expect(emailCall?.attachments).toHaveLength(2);
        expect(emailCall?.attachments?.[0]?.filename).toBe('peopleeat-gift-card.pdf');
        expect(emailCall?.attachments?.[1]?.filename).toBe('peopleeat-gift-card-receipt.pdf');
        expect(emailCall?.attachments?.[0]?.mediaType).toBe('application/pdf');
        expect(emailCall?.attachments?.[0]?.fileUploadId).toBeTruthy();
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalled();
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith(userMutationParent(user.userId));
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();

        const [row] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, created.referenceId!));
        expect(row?.paymentStatus).toBe('PAYED');
        expect(row?.cleanupJobId).toBeNull();
        expect(row?.invoiceAddress?.postalCode).toBe('10115');
        expect(row?.locale).toBe('en');
        expect(row?.voucherFileUploadId).toBe(emailCall?.attachments?.[0]?.fileUploadId);
        expect(row?.invoiceFileUploadId).toBe(emailCall?.attachments?.[1]?.fileUploadId);
    });

    it('still emails when receipt PDF capture fails', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_pay_pdf_fail',
            clientSecret: 'pi_pay_pdf_fail_secret',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue('job_pay_pdf_fail');
        vi.mocked(serverRuntime.jobs.cancel).mockResolvedValue(undefined);
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(serverRuntime.stripe.customerUpdate).mockResolvedValue(undefined);
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-pdf-fail' });
        vi.mocked(serverRuntime.browser.capturePdf).mockRejectedValue(new Error('capture failed'));

        const created = await giftCardCreate(userMutationParent(user.userId), { input: createInput }, requestingSession, serverRuntime);

        // Act
        const result = await giftCardPay(
            userMutationParent(user.userId),
            { input: { giftCardId: created.referenceId!, invoiceAddress } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(serverRuntime.email.send).toHaveBeenCalledOnce();
        const emailCall = vi.mocked(serverRuntime.email.send).mock.calls[0]?.[0];
        expect(emailCall?.attachments).toBeUndefined();
        const [row] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, created.referenceId!));
        expect(row?.paymentStatus).toBe('PAYED');
        expect(row?.invoiceFileUploadId).toBeNull();
        expect(row?.voucherFileUploadId).toBeNull();
    });

    it('is idempotent when the card is already PAYED', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_pay_2',
            clientSecret: 'pi_pay_2_secret',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue('job_pay_2');
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
        vi.mocked(serverRuntime.email.send).mockClear();
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockClear();

        // Act
        const again = await giftCardPay(
            userMutationParent(user.userId),
            { input: { giftCardId: created.referenceId!, invoiceAddress } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(again.success).toBe(true);
        expect(serverRuntime.email.send).not.toHaveBeenCalled();
        expect(serverRuntime.stripe.paymentIntentSucceededCheck).not.toHaveBeenCalled();
    });

    it('returns success false when the PaymentIntent has not succeeded', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_pay_3',
            clientSecret: 'pi_pay_3_secret',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue('job_pay_3');
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(false);

        const created = await giftCardCreate(userMutationParent(user.userId), { input: createInput }, requestingSession, serverRuntime);

        // Act
        const result = await giftCardPay(
            userMutationParent(user.userId),
            { input: { giftCardId: created.referenceId!, invoiceAddress } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.success).toBe(false);
        const [row] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, created.referenceId!));
        expect(row?.paymentStatus).toBe('PREPARED');
    });

    it('returns success false for a gift card owned by another session', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        vi.mocked(owner.serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_pay_other',
            clientSecret: 'pi_pay_other_secret',
        });
        vi.mocked(owner.serverRuntime.jobs.enqueue).mockResolvedValue('job_pay_other');

        const created = await giftCardCreate(
            userMutationParent(owner.user.userId),
            { input: createInput },
            owner.requestingSession,
            owner.serverRuntime,
        );

        // Act
        const result = await giftCardPay(
            userMutationParent(other.user.userId),
            { input: { giftCardId: created.referenceId!, invoiceAddress } },
            other.requestingSession,
            other.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(false);
    });
});
