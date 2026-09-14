import type { PromoCode } from '../db/schema';
import type { GqlSAdminPromoCode } from '../graphql/generated';

export function toGqlAdminPromoCode(promoCode: PromoCode): GqlSAdminPromoCode {
    return {
        promoCodeId: promoCode.promoCodeId,
        redeemCode: promoCode.redeemCode,
        amountCents: promoCode.amountCents,
        minimumTotalAmountCustomerCents: promoCode.minimumTotalAmountCustomerCents,
        scopedBookingRequestId: promoCode.bookingRequestId ?? null,
        expiresAt: promoCode.expiresAt,
        createdAt: promoCode.createdAt,
        bookingRequests: [],
    };
}
