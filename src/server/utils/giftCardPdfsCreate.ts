import { eq, inArray } from 'drizzle-orm';

import { fileUploadCreate } from '../commands/fileUploadCreate';
import { fileUploads, giftCards } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { environmentVariables } from '../env/environmentVariablesCreate';
import { fileUploadReferencedByOutboundEmailAttachment, fileUploadReferencedByWhatsAppAttachment } from './fileUploadContentAccess';
import { createServerToken } from './serverToken';

const RECEIPT_FILENAME = 'peopleeat-gift-card-receipt.pdf';
const VOUCHER_FILENAME = 'peopleeat-gift-card.pdf';
const PDF_MEDIA_TYPE = 'application/pdf';

export type GiftCardPdfCaptureResult = { fileUploadId: string; content: Buffer };

export const giftCardPdfFilenames = {
    receipt: RECEIPT_FILENAME,
    voucher: VOUCHER_FILENAME,
    mediaType: PDF_MEDIA_TYPE,
} as const;

/**
 * Capture receipt + voucher PDFs for a PAYED gift card, persist FileUploads, and
 * point `GiftCards` FKs at the new rows. Soft-fails per PDF (logs + null). Deletes
 * a replaced upload only when no outbound email or WhatsApp message still
 * attaches it (`OutboundEmailAttachments.fileUploadId` cascades on file delete).
 */
export async function giftCardPdfsCreate(
    giftCardId: string,
    buyerUserId: string | null,
    serverRuntime: ServerRuntime,
    previous?: { invoiceFileUploadId: string | null; voucherFileUploadId: string | null },
): Promise<{ receipt: GiftCardPdfCaptureResult | null; voucher: GiftCardPdfCaptureResult | null }> {
    const [receipt, voucher] = await Promise.all([
        giftCardReceiptPdfCreate(giftCardId, buyerUserId, serverRuntime),
        giftCardVoucherPdfCreate(giftCardId, buyerUserId, serverRuntime),
    ]);

    const obsoleteIds = [
        receipt && previous?.invoiceFileUploadId && previous.invoiceFileUploadId !== receipt.fileUploadId
            ? previous.invoiceFileUploadId
            : null,
        voucher && previous?.voucherFileUploadId && previous.voucherFileUploadId !== voucher.fileUploadId
            ? previous.voucherFileUploadId
            : null,
    ].filter((id): id is string => id != null);

    await giftCardPdfObsoleteDelete(serverRuntime, obsoleteIds);

    return { receipt, voucher };
}

/** Drop replaced PDFs that nothing else still points at. */
async function giftCardPdfObsoleteDelete(serverRuntime: ServerRuntime, obsoleteIds: string[]): Promise<void> {
    const deletable = (
        await Promise.all(
            obsoleteIds.map(async (fileUploadId) => {
                const [keptByEmail, keptByWhatsApp] = await Promise.all([
                    fileUploadReferencedByOutboundEmailAttachment(serverRuntime.db, fileUploadId),
                    fileUploadReferencedByWhatsAppAttachment(serverRuntime.db, fileUploadId),
                ]);
                return keptByEmail || keptByWhatsApp ? null : fileUploadId;
            }),
        )
    ).filter((fileUploadId): fileUploadId is string => fileUploadId != null);

    if (deletable.length === 0) return;

    await serverRuntime.db.delete(fileUploads).where(inArray(fileUploads.fileUploadId, deletable));
}

/** Shared regenerate for PAYED cards. Returns false when missing / not paid / both captures failed. */
export async function giftCardPdfsRegenerateForPayedCard(
    giftCardId: string,
    serverRuntime: ServerRuntime,
    options?: { requireBuyerUserId?: string },
): Promise<boolean> {
    const [row] = await serverRuntime.db.select().from(giftCards).where(eq(giftCards.giftCardId, giftCardId)).limit(1);

    if (!row || row.paymentStatus !== 'PAYED') {
        return false;
    }

    if (options?.requireBuyerUserId != null && row.buyerUserId !== options.requireBuyerUserId) {
        return false;
    }

    const { receipt, voucher } = await giftCardPdfsCreate(giftCardId, row.buyerUserId, serverRuntime, {
        invoiceFileUploadId: row.invoiceFileUploadId,
        voucherFileUploadId: row.voucherFileUploadId,
    });

    if (row.buyerUserId) {
        await serverRuntime.publish.userUpdates({ userId: row.buyerUserId });
    }
    await serverRuntime.publish.adminUpdates();

    return receipt != null || voucher != null;
}

async function giftCardReceiptPdfCreate(
    giftCardId: string,
    buyerUserId: string | null,
    serverRuntime: ServerRuntime,
): Promise<GiftCardPdfCaptureResult | null> {
    try {
        const token = createServerToken(giftCardId);
        const url = `${environmentVariables.webPageUrl}/server/gift-cards/${giftCardId}/receipt?token=${encodeURIComponent(token)}`;
        const content = await serverRuntime.browser.capturePdf({
            url,
            waitForSelector: '[data-receipt-ready]',
        });
        const fileUpload = await fileUploadCreate(serverRuntime.db, {
            userId: buyerUserId,
            filename: RECEIPT_FILENAME,
            mediaType: PDF_MEDIA_TYPE,
            bytes: content,
        });
        await serverRuntime.db
            .update(giftCards)
            .set({ invoiceFileUploadId: fileUpload.fileUploadId })
            .where(eq(giftCards.giftCardId, giftCardId));
        return { fileUploadId: fileUpload.fileUploadId, content };
    } catch (error) {
        serverRuntime.log.error(error, null);
        return null;
    }
}

async function giftCardVoucherPdfCreate(
    giftCardId: string,
    buyerUserId: string | null,
    serverRuntime: ServerRuntime,
): Promise<GiftCardPdfCaptureResult | null> {
    try {
        const token = createServerToken(giftCardId);
        const url = `${environmentVariables.webPageUrl}/server/gift-cards/${giftCardId}/voucher?token=${encodeURIComponent(token)}`;
        const content = await serverRuntime.browser.capturePdf({
            url,
            waitForSelector: '[data-voucher-ready]',
        });
        const fileUpload = await fileUploadCreate(serverRuntime.db, {
            userId: buyerUserId,
            filename: VOUCHER_FILENAME,
            mediaType: PDF_MEDIA_TYPE,
            bytes: content,
        });
        await serverRuntime.db
            .update(giftCards)
            .set({ voucherFileUploadId: fileUpload.fileUploadId })
            .where(eq(giftCards.giftCardId, giftCardId));
        return { fileUploadId: fileUpload.fileUploadId, content };
    } catch (error) {
        serverRuntime.log.error(error, null);
        return null;
    }
}
