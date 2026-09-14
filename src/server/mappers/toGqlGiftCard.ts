import type { GiftCard } from '../db/schema';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { GqlSGiftCard } from '../graphql/generated';
import { toGqlInvoiceAddress } from './toGqlInvoiceAddress';

export function toGqlGiftCard(giftCard: GiftCard): GqlSGiftCard {
    const isPayed = giftCard.paymentStatus === 'PAYED';
    const isPrepared = giftCard.paymentStatus === 'PREPARED';
    const publishableKey = environmentVariables.stripePublishableKey;

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
        payment:
            isPrepared && publishableKey
                ? {
                      clientSecret: giftCard.paymentClientSecret,
                      publishableKey,
                  }
                : null,
        invoiceAddress: giftCard.invoiceAddress ? toGqlInvoiceAddress(giftCard.invoiceAddress) : null,
        expiresAt: giftCard.expiresAt,
        createdAt: giftCard.createdAt,
    };
}
