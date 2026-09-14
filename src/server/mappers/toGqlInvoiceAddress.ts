import type { GiftCardInvoiceAddress } from '../domain/giftCard';
import type { GqlSInvoiceAddress } from '../graphql/generated';

export function toGqlInvoiceAddress(address: GiftCardInvoiceAddress): GqlSInvoiceAddress {
    return {
        companyName: address.companyName ?? null,
        firstName: address.firstName,
        lastName: address.lastName,
        country: address.country,
        city: address.city,
        postalCode: address.postalCode,
        line1: address.line1,
        line2: address.line2,
    };
}
