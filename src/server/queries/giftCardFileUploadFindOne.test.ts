import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { fileUploads, giftCards } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { giftCardFileUploadFindOne } from './giftCardFileUploadFindOne';

describe('giftCardFileUploadFindOne', () => {
    it('returns the mapped file upload when fileUploadId is set', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const fileUploadId = idCreate();
        const bytes = Buffer.from('%PDF');
        await testDb.insert(fileUploads).values({
            fileUploadId,
            userId: null,
            filename: 'receipt.pdf',
            mediaType: 'application/pdf',
            size: bytes.byteLength,
            bytes,
        });
        const giftCardId = idCreate();
        await testDb.insert(giftCards).values({
            giftCardId,
            sessionId: requestingSession.sessionId,
            buyerEmail: 'buyer@example.com',
            locale: 'en',
            occasion: 'Birthday',
            recipientName: 'Ada Lovelace',
            message: '',
            originalBalanceCents: 5000,
            balanceCents: 5000,
            redeemCode: `INV-${idCreate().slice(0, 8)}`,
            paymentIntentId: 'pi_invoice',
            paymentClientSecret: 'secret_invoice',
            paymentStatus: 'PAYED',
            invoiceFileUploadId: fileUploadId,
            expiresAt: new Date(Date.now() + 86_400_000),
        });

        // Act
        const result = await giftCardFileUploadFindOne(fileUploadId, serverRuntime);

        // Assert
        expect(result).toMatchObject({
            fileUploadId,
            filename: 'receipt.pdf',
            mediaType: 'application/pdf',
        });
    });

    it('returns null when fileUploadId is null', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup.withUser();

        // Act
        const result = await giftCardFileUploadFindOne(null, serverRuntime);

        // Assert
        expect(result).toBeNull();
    });

    it('returns null when the file upload id is unknown', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup.withUser();

        // Act
        const result = await giftCardFileUploadFindOne(idCreate(), serverRuntime);

        // Assert
        expect(result).toBeNull();
    });
});
