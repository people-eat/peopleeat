import { and, eq } from 'drizzle-orm';

import { invoiceAddressNormalize } from '../../shared/invoiceAddressNormalize';
import { giftCards } from '../db/schema';
import type { GiftCardInvoiceAddress } from '../domain/giftCard';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GiftCardPayForCustomerEmail, giftCardPayForCustomerEmailSubject } from '../email/templates/GiftCardPayForCustomerEmail';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationGiftCardPayArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { giftCardPreparedExpire } from '../jobs/handlers/giftCardPreparedExpire';
import { giftCardPdfFilenames, giftCardPdfsCreate } from '../utils/giftCardPdfsCreate';
import { sessionEventCreate } from '../utils/sessionEventCreate';

async function cancelCleanupJob(serverRuntime: ServerRuntime, cleanupJobId: string | null | undefined): Promise<void> {
    if (!cleanupJobId) return;
    try {
        await serverRuntime.jobs.cancel(giftCardPreparedExpire.name, cleanupJobId);
    } catch (error) {
        serverRuntime.log.error(error, null);
    }
}

export async function giftCardPay(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationGiftCardPayArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const input = args.input;
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(giftCards)
            .where(
                and(
                    eq(giftCards.giftCardId, input.giftCardId),
                    eq(giftCards.sessionId, requestingSession.sessionId),
                    eq(giftCards.buyerUserId, userId),
                ),
            )
            .limit(1);

        if (!row) {
            return { success: false };
        }

        if (row.paymentStatus === 'PAYED') {
            return { success: true, referenceId: row.giftCardId };
        }

        const succeeded = await serverRuntime.stripe.paymentIntentSucceededCheck(row.paymentIntentId);
        if (!succeeded) {
            return { success: false };
        }

        // Phase 1 — Payload construction
        const invoiceAddress: GiftCardInvoiceAddress = invoiceAddressNormalize(input.invoiceAddress);

        await serverRuntime.stripe.customerUpdate({
            userId,
            emailAddress: row.buyerEmail,
            firstName: invoiceAddress.firstName,
            lastName: invoiceAddress.lastName,
            address: {
                country: invoiceAddress.country,
                city: invoiceAddress.city,
                postCode: invoiceAddress.postalCode,
                line1: invoiceAddress.line1,
                line2: invoiceAddress.line2 || undefined,
            },
        });

        // Phase 2 — Transactional execution
        await serverRuntime.db
            .update(giftCards)
            .set({
                paymentStatus: 'PAYED',
                invoiceAddress,
                cleanupJobId: null,
            })
            .where(eq(giftCards.giftCardId, row.giftCardId));

        await cancelCleanupJob(serverRuntime, row.cleanupJobId);

        const { receipt, voucher } = await giftCardPdfsCreate(row.giftCardId, userId, serverRuntime, {
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
                buyerFirstName: invoiceAddress.firstName,
            }),
            purpose: 'GIFT_CARD_PURCHASED',
            locale,
            relatedEntity: { type: 'GIFT_CARD', id: row.giftCardId },
            userId,
            attachments: attachments.length > 0 ? attachments : undefined,
        });

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'GIFT_CARD_PAYED',
            payload: { giftCardId: row.giftCardId },
        });

        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });
        await serverRuntime.publish.userUpdates({ userId });
        await serverRuntime.publish.adminUpdates();

        const { slackNotifyGiftCardPaid } = await import('../slack/slackNotifyAdjacent');
        await slackNotifyGiftCardPaid(serverRuntime, {
            giftCardId: row.giftCardId,
            amountCents: row.balanceCents,
            buyerEmail: row.buyerEmail,
            recipientEmail: row.recipientName,
        });

        return { success: true, referenceId: row.giftCardId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
