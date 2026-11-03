import { eq, inArray } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { fileUploads, giftCards, outboundEmailAttachments, outboundEmails } from '../db/schema';
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

    it('keeps emailed PDFs and deletes only unreferenced replacements', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        vi.mocked(serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
            paymentIntentId: 'pi_regen_keep',
            clientSecret: 'pi_regen_keep_secret',
        });
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue('job_regen_keep');
        vi.mocked(serverRuntime.jobs.cancel).mockResolvedValue(undefined);
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(serverRuntime.stripe.customerUpdate).mockResolvedValue(undefined);
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-keep' });
        vi.mocked(serverRuntime.browser.capturePdf).mockResolvedValue(Buffer.from('%PDF-1'));

        const created = await giftCardCreate(userMutationParent(user.userId), { input: createInput }, requestingSession, serverRuntime);
        await giftCardPay(
            userMutationParent(user.userId),
            { input: { giftCardId: created.referenceId!, invoiceAddress } },
            requestingSession,
            serverRuntime,
        );

        const [emailed] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, created.referenceId!));
        const emailedIds = [emailed?.invoiceFileUploadId, emailed?.voucherFileUploadId].filter((id): id is string => id != null);
        expect(emailedIds).toHaveLength(2);

        const outboundEmailId = idCreate();
        await testDb.insert(outboundEmails).values({
            outboundEmailId,
            provider: 'console',
            purpose: 'GIFT_CARD_PURCHASED',
            toEmail: user.emailAddress ?? 'buyer@example.com',
            subject: 'Gift card',
            locale: 'en',
            relatedEntityType: 'GIFT_CARD',
            relatedEntityId: created.referenceId!,
        });
        await testDb
            .insert(outboundEmailAttachments)
            .values(emailedIds.map((fileUploadId, position) => ({ outboundEmailId, fileUploadId, position })));

        vi.mocked(serverRuntime.browser.capturePdf).mockResolvedValue(Buffer.from('%PDF-2'));
        const first = await giftCardPdfsRegenerate(
            userMutationParent(user.userId),
            { giftCardId: created.referenceId! },
            requestingSession,
            serverRuntime,
        );
        expect(first.success).toBe(true);

        const [replaced] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, created.referenceId!));
        const intermediateIds = [replaced?.invoiceFileUploadId, replaced?.voucherFileUploadId].filter((id): id is string => id != null);
        expect(intermediateIds).toHaveLength(2);
        for (const fileUploadId of intermediateIds) {
            expect(emailedIds).not.toContain(fileUploadId);
        }

        const emailedFiles = await testDb.select().from(fileUploads).where(inArray(fileUploads.fileUploadId, emailedIds));
        expect(emailedFiles).toHaveLength(2);
        const emailedAttachments = await testDb
            .select()
            .from(outboundEmailAttachments)
            .where(eq(outboundEmailAttachments.outboundEmailId, outboundEmailId));
        expect(emailedAttachments).toHaveLength(2);

        vi.mocked(serverRuntime.browser.capturePdf).mockResolvedValue(Buffer.from('%PDF-3'));
        const second = await giftCardPdfsRegenerate(
            userMutationParent(user.userId),
            { giftCardId: created.referenceId! },
            requestingSession,
            serverRuntime,
        );
        expect(second.success).toBe(true);

        const intermediateFiles = await testDb.select().from(fileUploads).where(inArray(fileUploads.fileUploadId, intermediateIds));
        expect(intermediateFiles).toHaveLength(0);
        const emailedFilesAfter = await testDb.select().from(fileUploads).where(inArray(fileUploads.fileUploadId, emailedIds));
        expect(emailedFilesAfter).toHaveLength(2);
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
