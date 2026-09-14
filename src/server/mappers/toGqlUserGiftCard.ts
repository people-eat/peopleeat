import type { GiftCard } from '../db/schema';
import type { GqlSUserGiftCard } from '../graphql/generated';
import { toGqlInvoiceAddress } from './toGqlInvoiceAddress';

export function toGqlUserGiftCard(giftCard: GiftCard): GqlSUserGiftCard {
    const isPayed = giftCard.paymentStatus === 'PAYED';

    return {
        giftCardId: giftCard.giftCardId,
        buyerEmail: giftCard.buyerEmail,
        occasion: giftCard.occasion,
        recipientName: giftCard.recipientName,
        message: giftCard.message,
        originalBalanceCents: giftCard.originalBalanceCents,
        balanceCents: giftCard.balanceCents,
        redeemCode: isPayed ? giftCard.redeemCode : null,
        paymentStatus: giftCard.paymentStatus,
        invoiceAddress: giftCard.invoiceAddress ? toGqlInvoiceAddress(giftCard.invoiceAddress) : null,
        invoiceFileUploadId: giftCard.invoiceFileUploadId ?? null,
        // Overridden by `UserGiftCard.invoiceFileUpload` field resolver.
        invoiceFileUpload: null,
        voucherFileUploadId: giftCard.voucherFileUploadId ?? null,
        // Overridden by `UserGiftCard.voucherFileUpload` field resolver.
        voucherFileUpload: null,
        expiresAt: giftCard.expiresAt,
        createdAt: giftCard.createdAt,
    };
}
