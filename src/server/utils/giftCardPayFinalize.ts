import { and, eq, isNull } from 'drizzle-orm';

import { giftCards } from '../db/schema';
import type { GiftCard } from '../db/schema';
import type { GiftCardInvoiceAddress } from '../domain/giftCard';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GiftCardPayForCustomerEmail, giftCardPayForCustomerEmailSubject } from '../email/templates/GiftCardPayForCustomerEmail';
import { environmentVariables } from '../env/environmentVariablesCreate';
import { giftCardPreparedExpire } from '../jobs/handlers/giftCardPreparedExpire';
import { giftCardPdfFilenames, giftCardPdfsCreate } from './giftCardPdfsCreate';
import { sessionEventCreate } from './sessionEventCreate';

async function cancelCleanupJob(serverRuntime: ServerRuntime, cleanupJobId: string | null | undefined): Promise<void> {
    if (!cleanupJobId) return;
    try {
        await serverRuntime.jobs.cancel(giftCardPreparedExpire.name, cleanupJobId);
    } catch (error) {
        serverRuntime.log.error(error, null);
    }
}

async function giftCardInvoiceAddressBackfill(
    serverRuntime: ServerRuntime,
    giftCardId: string,
    invoiceAddress: GiftCardInvoiceAddress | null,
): Promise<void> {
    if (!invoiceAddress) return;
    await serverRuntime.db
        .update(giftCards)
        .set({ invoiceAddress })
        .where(and(eq(giftCards.giftCardId, giftCardId), isNull(giftCards.invoiceAddress)));
}

/**
 * Marks a prepared gift card PAYED and sends the redeem-code email once.
 * Client `giftCardPay` and `payment_intent.succeeded` share this claim: only
 * the winner captures PDFs, emails, and notifies Slack.
 */
export async function giftCardPayFinalize(
    serverRuntime: ServerRuntime,
    row: GiftCard,
    invoiceAddress: GiftCardInvoiceAddress | null,
): Promise<{ advanced: boolean }> {
    if (row.paymentStatus === 'PAYED') {
        await giftCardInvoiceAddressBackfill(serverRuntime, row.giftCardId, invoiceAddress);
        return { advanced: false };
    }

    const payedAt = new Date();
    const [claimed] = await serverRuntime.db
        .update(giftCards)
        .set({
            paymentStatus: 'PAYED',
            payedAt,
            cleanupJobId: null,
            ...(invoiceAddress ? { invoiceAddress } : {}),
        })
        .where(and(eq(giftCards.giftCardId, row.giftCardId), eq(giftCards.paymentStatus, 'PREPARED')))
        .returning({ giftCardId: giftCards.giftCardId });

    if (!claimed) {
        const [again] = await serverRuntime.db
            .select({ paymentStatus: giftCards.paymentStatus })
            .from(giftCards)
            .where(eq(giftCards.giftCardId, row.giftCardId))
            .limit(1);
        if (again?.paymentStatus === 'PAYED') {
            await giftCardInvoiceAddressBackfill(serverRuntime, row.giftCardId, invoiceAddress);
            return { advanced: false };
        }
        throw new Error('giftCardPayFinalize: claim lost and card is not PAYED');
    }

    await cancelCleanupJob(serverRuntime, row.cleanupJobId);

    const { receipt, voucher } = await giftCardPdfsCreate(row.giftCardId, row.buyerUserId, serverRuntime, {
        invoiceFileUploadId: row.invoiceFileUploadId,
        voucherFileUploadId: row.voucherFileUploadId,
    });

    const locale = row.locale;
    const attachments = [
        voucher
            ? {
                  filename: giftCardPdfFilenames.voucher,
                  content: voucher.content,
                  mediaType: giftCardPdfFilenames.mediaType,
                  fileUploadId: voucher.fileUploadId,
              }
            : null,
        receipt
            ? {
                  filename: giftCardPdfFilenames.receipt,
                  content: receipt.content,
                  mediaType: giftCardPdfFilenames.mediaType,
                  fileUploadId: receipt.fileUploadId,
              }
            : null,
    ].filter((attachment): attachment is NonNullable<typeof attachment> => attachment != null);

    await serverRuntime.email.send({
        to: row.buyerEmail,
        subject: giftCardPayForCustomerEmailSubject(locale),
        react: GiftCardPayForCustomerEmail({
            redeemCode: row.redeemCode,
            balanceCents: row.balanceCents,
            expiresAt: row.expiresAt,
            recipientName: row.recipientName,
            message: row.message,
            locale,
            webPageUrl: environmentVariables.webPageUrl,
            buyerFirstName: invoiceAddress?.firstName,
        }),
        purpose: 'GIFT_CARD_PURCHASED',
        locale,
        relatedEntity: { type: 'GIFT_CARD', id: row.giftCardId },
        userId: row.buyerUserId,
        attachments: attachments.length > 0 ? attachments : undefined,
    });

    await sessionEventCreate(serverRuntime, {
        sessionId: row.sessionId,
        type: 'GIFT_CARD_PAYED',
        payload: { giftCardId: row.giftCardId },
    });

    await serverRuntime.publish.sessionUpdates({ sessionId: row.sessionId });
    if (row.buyerUserId) {
        await serverRuntime.publish.userUpdates({ userId: row.buyerUserId });
    }
    await serverRuntime.publish.adminUpdates();

    const { slackNotifyGiftCardPaid } = await import('../slack/slackNotifyAdjacent');
    await slackNotifyGiftCardPaid(serverRuntime, {
        giftCardId: row.giftCardId,
        amountCents: row.balanceCents,
        buyerEmail: row.buyerEmail,
        recipientEmail: row.recipientName,
    });

    return { advanced: true };
}
