import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { fileUploadCreate } from '../commands/fileUploadCreate';
import { giftCards, outboundEmailAttachments, outboundEmails } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { fileUploadReferencedByGiftCardPdf, fileUploadReferencedByOutboundEmailAttachment } from './fileUploadContentAccess';

describe('fileUploadContentAccess invoice helpers', () => {
    it('detects a gift-card invoice file upload', async () => {
        const { requestingSession } = await commandSetup();
        const upload = await fileUploadCreate(testDb, {
            userId: null,
            filename: 'receipt.pdf',
            mediaType: 'application/pdf',
            bytes: Buffer.from('%PDF'),
        });

        await testDb.insert(giftCards).values({
            giftCardId: idCreate(),
            sessionId: requestingSession.sessionId,
            buyerEmail: 'buyer@example.com',
            locale: 'en',
            occasion: 'Birthday',
            recipientName: 'Ada Lovelace',
            message: '',
            originalBalanceCents: 5000,
            balanceCents: 5000,
            redeemCode: `TEST-${idCreate().slice(0, 8)}`,
            paymentIntentId: 'pi_test',
            paymentClientSecret: 'pi_test_secret',
            paymentStatus: 'PAYED',
            invoiceFileUploadId: upload.fileUploadId,
            expiresAt: new Date(Date.now() + 86_400_000),
        });

        expect(await fileUploadReferencedByGiftCardPdf(testDb, upload.fileUploadId)).toBe(true);
        expect(await fileUploadReferencedByGiftCardPdf(testDb, idCreate())).toBe(false);
    });

    it('detects a gift-card voucher file upload', async () => {
        const { requestingSession } = await commandSetup();
        const upload = await fileUploadCreate(testDb, {
            userId: null,
            filename: 'voucher.pdf',
            mediaType: 'application/pdf',
            bytes: Buffer.from('%PDF'),
        });

        await testDb.insert(giftCards).values({
            giftCardId: idCreate(),
            sessionId: requestingSession.sessionId,
            buyerEmail: 'buyer@example.com',
            locale: 'en',
            occasion: 'Birthday',
            recipientName: 'Ada Lovelace',
            message: '',
            originalBalanceCents: 5000,
            balanceCents: 5000,
            redeemCode: `TEST-${idCreate().slice(0, 8)}`,
            paymentIntentId: 'pi_test_voucher',
            paymentClientSecret: 'pi_test_voucher_secret',
            paymentStatus: 'PAYED',
            voucherFileUploadId: upload.fileUploadId,
            expiresAt: new Date(Date.now() + 86_400_000),
        });

        expect(await fileUploadReferencedByGiftCardPdf(testDb, upload.fileUploadId)).toBe(true);
    });

    it('detects an outbound-email attachment file upload', async () => {
        await commandSetup();
        const upload = await fileUploadCreate(testDb, {
            userId: null,
            filename: 'receipt.pdf',
            mediaType: 'application/pdf',
            bytes: Buffer.from('%PDF'),
        });
        const outboundEmailId = idCreate();
        await testDb.insert(outboundEmails).values({
            outboundEmailId,
            provider: 'console',
            purpose: 'GIFT_CARD_PURCHASED',
            toEmail: 'buyer@example.com',
            subject: 'Gift card',
            locale: 'en',
        });
        await testDb.insert(outboundEmailAttachments).values({
            outboundEmailId,
            fileUploadId: upload.fileUploadId,
            position: 0,
        });

        expect(await fileUploadReferencedByOutboundEmailAttachment(testDb, upload.fileUploadId)).toBe(true);
        expect(await fileUploadReferencedByOutboundEmailAttachment(testDb, idCreate())).toBe(false);
    });
});
