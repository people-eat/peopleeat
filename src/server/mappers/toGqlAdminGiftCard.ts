import type { GiftCard } from '../db/schema';
import type { GqlSAdminGiftCard } from '../graphql/generated';
import { toGqlInvoiceAddress } from './toGqlInvoiceAddress';

export function toGqlAdminGiftCard(giftCard: GiftCard): GqlSAdminGiftCard {
    return {
        giftCardId: giftCard.giftCardId,
        buyerEmail: giftCard.buyerEmail,
        buyerUserId: giftCard.buyerUserId,
        occasion: giftCard.occasion,
        recipientName: giftCard.recipientName,
        message: giftCard.message,
        originalBalanceCents: giftCard.originalBalanceCents,
        balanceCents: giftCard.balanceCents,
        redeemCode: giftCard.redeemCode,
        paymentStatus: giftCard.paymentStatus,
        invoiceAddress: giftCard.invoiceAddress ? toGqlInvoiceAddress(giftCard.invoiceAddress) : null,
        invoiceFileUploadId: giftCard.invoiceFileUploadId ?? null,
        // Overridden by `AdminGiftCard.invoiceFileUpload` field resolver.
        invoiceFileUpload: null,
        voucherFileUploadId: giftCard.voucherFileUploadId ?? null,
        // Overridden by `AdminGiftCard.voucherFileUpload` field resolver.
        voucherFileUpload: null,
        expiresAt: giftCard.expiresAt,
        createdAt: giftCard.createdAt,
    };
}
