import { eq } from 'drizzle-orm';

import { invoiceAddressNormalize } from '../../shared/invoiceAddressNormalize';
import { giftCards } from '../db/schema';
import type { GiftCardInvoiceAddress } from '../domain/giftCard';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { StripePaymentIntentBillingAddress } from '../stripe/StripePayment';
import { giftCardPayFinalize } from '../utils/giftCardPayFinalize';

function giftCardInvoiceAddressFromBilling(billing: StripePaymentIntentBillingAddress): GiftCardInvoiceAddress | null {
    const name = billing.name?.trim() ?? '';
    const space = name.indexOf(' ');
    const firstName = space === -1 ? name : name.slice(0, space);
    const lastName = space === -1 ? '' : name.slice(space + 1).trim();
    const address = billing.address;
    if (!firstName || !lastName || !address?.country || !address.city || !address.postalCode || !address.line1) {
        return null;
    }
    return invoiceAddressNormalize({
        companyName: '',
        firstName,
        lastName,
        country: address.country,
        city: address.city,
        postalCode: address.postalCode,
        line1: address.line1,
        line2: address.line2 ?? '',
    });
}

/**
 * Webhook path for gift-card PaymentIntents. No-ops when the id is not a gift
 * card. A repeat event is a no-op once the card is PAYED (single-winner claim
 * inside `giftCardPayFinalize`).
 */
export async function giftCardPaymentIntentSucceededApply(paymentIntentId: string, serverRuntime: ServerRuntime): Promise<boolean> {
    const [row] = await serverRuntime.db.select().from(giftCards).where(eq(giftCards.paymentIntentId, paymentIntentId)).limit(1);
    if (!row) {
        return false;
    }
    if (row.paymentStatus === 'PAYED') {
        return true;
    }

    const succeeded = await serverRuntime.stripe.paymentIntentSucceededCheck(paymentIntentId);
    if (!succeeded) {
        throw new Error('giftCardPaymentIntentSucceededApply: payment intent not succeeded');
    }

    const billing = await serverRuntime.stripe.paymentIntentBillingAddressFindOne(paymentIntentId);
    const invoiceAddress = billing ? giftCardInvoiceAddressFromBilling(billing) : null;

    if (invoiceAddress && row.buyerUserId) {
        await serverRuntime.stripe.customerUpdate({
            userId: row.buyerUserId,
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
    }

    await giftCardPayFinalize(serverRuntime, row, invoiceAddress);
    return true;
}
