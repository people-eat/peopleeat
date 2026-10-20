import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { giftCards } from '../db/schema';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { giftCardCreate } from './giftCardCreate';
import { giftCardPay } from './giftCardPay';
import { giftCardPdfsRegenerate } from './giftCardPdfsRegenerate';

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

describe('giftCardPdfsRegenerate', () => {
    it('recreates voucher and receipt PDFs for a paid buyer-owned card', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_regen_1',
            clientSecret: 'pi_regen_1_secret',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue('job_regen_1');
        vi.mocked(serverRuntime.jobs.cancel).mockResolvedValue(undefined);
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(serverRuntime.stripe.customerUpdate).mockResolvedValue(undefined);
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-regen' });
        vi.mocked(serverRuntime.browser.capturePdf).mockResolvedValue(Buffer.from('%PDF-1'));

        const created = await giftCardCreate(userMutationParent(user.userId), { input: createInput }, requestingSession, serverRuntime);
        await giftCardPay(
            userMutationParent(user.userId),
            { input: { giftCardId: created.referenceId!, invoiceAddress } },
            requestingSession,
            serverRuntime,
        );

        const [before] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, created.referenceId!));
        vi.mocked(serverRuntime.browser.capturePdf).mockResolvedValue(Buffer.from('%PDF-2'));

        const result = await giftCardPdfsRegenerate(
            userMutationParent(user.userId),
            { giftCardId: created.referenceId! },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        const [after] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, created.referenceId!));
        expect(after?.voucherFileUploadId).toBeTruthy();
        expect(after?.invoiceFileUploadId).toBeTruthy();
        expect(after?.voucherFileUploadId).not.toBe(before?.voucherFileUploadId);
        expect(after?.invoiceFileUploadId).not.toBe(before?.invoiceFileUploadId);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('returns false for prepared cards', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_regen_prep',
            clientSecret: 'pi_regen_prep_secret',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue('job_regen_prep');

        const created = await giftCardCreate(userMutationParent(user.userId), { input: createInput }, requestingSession, serverRuntime);
        const result = await giftCardPdfsRegenerate(
            userMutationParent(user.userId),
            { giftCardId: created.referenceId! },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(false);
    });
});
