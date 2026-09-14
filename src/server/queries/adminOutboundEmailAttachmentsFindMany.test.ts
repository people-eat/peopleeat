import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { fileUploads, outboundEmailAttachments, outboundEmails } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminOutboundEmailAttachmentsFindMany } from './adminOutboundEmailAttachmentsFindMany';

async function insertPdf(filename: string, marker: string) {
    const fileUploadId = idCreate();
    const bytes = Buffer.from(marker);
    await testDb.insert(fileUploads).values({
        fileUploadId,
        userId: null,
        filename,
        mediaType: 'application/pdf',
        size: bytes.byteLength,
        bytes,
    });
    return fileUploadId;
}

describe('adminOutboundEmailAttachmentsFindMany', () => {
    it('returns attachments ordered by position', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup.withUser();
        const outboundEmailId = idCreate();
        await testDb.insert(outboundEmails).values({
            outboundEmailId,
            provider: 'resend',
            purpose: 'AUTH_EMAIL_OTP',
            toEmail: 'guest@example.com',
            subject: 'Your code',
            locale: 'en',
        });
        const firstId = await insertPdf('first.pdf', '%PDF-1');
        const secondId = await insertPdf('second.pdf', '%PDF-2');
        await testDb.insert(outboundEmailAttachments).values([
            { outboundEmailId, fileUploadId: secondId, position: 1 },
            { outboundEmailId, fileUploadId: firstId, position: 0 },
        ]);

        // Act
        const rows = await adminOutboundEmailAttachmentsFindMany({ outboundEmailId }, serverRuntime);

        // Assert
        expect(rows.map((row) => row.fileUploadId)).toEqual([firstId, secondId]);
        expect(rows.map((row) => row.filename)).toEqual(['first.pdf', 'second.pdf']);
    });

    it('returns an empty array when there are no attachments', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup.withUser();
        const outboundEmailId = idCreate();
        await testDb.insert(outboundEmails).values({
            outboundEmailId,
            provider: 'resend',
            purpose: 'AUTH_EMAIL_OTP',
            toEmail: 'guest@example.com',
            subject: 'Your code',
            locale: 'en',
        });

        // Act
        const rows = await adminOutboundEmailAttachmentsFindMany({ outboundEmailId }, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });
});
