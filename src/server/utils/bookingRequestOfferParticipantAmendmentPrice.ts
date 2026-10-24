import {
    bookingRequestOfferMenuPriceScaleByPaidParticipants,
    bookingRequestOfferPriceCalculate,
} from '../../shared/bookingRequestOfferPrice';
import { bookingRequestPaidParticipants } from '../../shared/bookingRequestOfferPriceGuidance';
import type { BookingRequestParticipantType } from '../domain/bookingRequest';

export type BookingRequestOfferParticipantAmendmentPriceInput = {
    menuPriceCentsBefore: number;
    travelExpensesCentsAfter: number;
    totalWithoutDiscountsCentsCustomerBefore: number;
    totalCentsCustomerBefore: number;
    giftCardAppliedCentsBefore: number;
    /** Remaining balance on the linked gift card (not yet applied to this booking). */
    giftCardBalanceCents: number;
    /** Fixed promo amount on the booking request (0 when none). */
    promoAmountCents: number;
    participantsBefore: { type: BookingRequestParticipantType }[];
    participantsAfter: { type: BookingRequestParticipantType }[];
    /** When false, keep menu total (location-only amendment). Default true when headcount changes. */
    scaleMenuByParticipants?: boolean;
    /** Absolute menu total (admin). When set, skips paid-headcount scaling. */
    menuPriceCentsOverride?: number;
    /** Sticky offer fee % (required so amendments do not reset to marketplace defaults). */
    platformFeePercentCook: number;
    platformFeePercentCustomer: number;
};

export type BookingRequestOfferParticipantAmendmentPriceResult = {
    paidParticipantsBefore: number;
    paidParticipantsAfter: number;
    menuPriceCentsAfter: number;
    platformFeePercentCook: number;
    platformFeePercentCustomer: number;
    travelExpensesCents: number;
    paymentProviderFeeCents: number;
    platformFeeCentsCook: number;
    platformFeeCentsCustomer: number;
    payoutCentsCookAfter: number;
    totalWithoutDiscountsCentsCustomerAfter: number;
    promoAppliedCentsAfter: number;
    giftCardAppliedCentsAfter: number;
    giftCardDeltaCents: number;
    totalCentsCustomerAfter: number;
    customerDeltaCents: number;
    cookPayoutDeltaCents: number;
};

function participantCounts(participants: { type: BookingRequestParticipantType }[]) {
    const adults = participants.filter((participant) => participant.type === 'ADULT').length;
    const discounted = participants.filter((participant) => participant.type === 'DISCOUNTED').length;
    return { adults, discounted };
}

/**
 * Scale locked menu total by paid-headcount ratio (optional), recompute fee snapshot,
 * then re-apply promo + gift against the new pre-discount total.
 */
export function bookingRequestOfferParticipantAmendmentPriceCalculate(
    input: BookingRequestOfferParticipantAmendmentPriceInput,
    payoutCentsCookBefore: number,
): BookingRequestOfferParticipantAmendmentPriceResult {
    const before = participantCounts(input.participantsBefore);
    const after = participantCounts(input.participantsAfter);
    const paidParticipantsBefore = bookingRequestPaidParticipants(before.adults, before.discounted);
    const paidParticipantsAfter = bookingRequestPaidParticipants(after.adults, after.discounted);

    const menuPriceCentsAfter =
        input.menuPriceCentsOverride != null
            ? input.menuPriceCentsOverride
            : input.scaleMenuByParticipants !== false
              ? bookingRequestOfferMenuPriceScaleByPaidParticipants({
                    menuPriceCents: input.menuPriceCentsBefore,
                    paidParticipantsBefore,
                    paidParticipantsAfter,
                })
              : input.menuPriceCentsBefore;

    const price = bookingRequestOfferPriceCalculate({
        menuPriceCents: menuPriceCentsAfter,
        travelExpensesCents: input.travelExpensesCentsAfter,
        platformFeePercentCook: input.platformFeePercentCook,
        platformFeePercentCustomer: input.platformFeePercentCustomer,
    });

    const promoAppliedCentsAfter = Math.min(Math.max(0, input.promoAmountCents), price.totalWithoutDiscountsCentsCustomer);
    const afterPromo = Math.max(0, price.totalWithoutDiscountsCentsCustomer - promoAppliedCentsAfter);
    const giftCapacity = Math.max(0, input.giftCardAppliedCentsBefore) + Math.max(0, input.giftCardBalanceCents);
    const giftCardAppliedCentsAfter = Math.min(giftCapacity, afterPromo);
    const totalCentsCustomerAfter = Math.max(0, afterPromo - giftCardAppliedCentsAfter);
    const giftCardDeltaCents = giftCardAppliedCentsAfter - input.giftCardAppliedCentsBefore;

    return {
        paidParticipantsBefore,
        paidParticipantsAfter,
        menuPriceCentsAfter: price.menuPriceCents,
        platformFeePercentCook: price.platformFeePercentCook,
        platformFeePercentCustomer: price.platformFeePercentCustomer,
        travelExpensesCents: price.travelExpensesCents,
        paymentProviderFeeCents: price.paymentProviderFeeCents,
        platformFeeCentsCook: price.platformFeeCentsCook,
        platformFeeCentsCustomer: price.platformFeeCentsCustomer,
        payoutCentsCookAfter: price.payoutCentsCook,
        totalWithoutDiscountsCentsCustomerAfter: price.totalWithoutDiscountsCentsCustomer,
        promoAppliedCentsAfter,
        giftCardAppliedCentsAfter,
        giftCardDeltaCents,
        totalCentsCustomerAfter,
        customerDeltaCents: totalCentsCustomerAfter - input.totalCentsCustomerBefore,
        cookPayoutDeltaCents: price.payoutCentsCook - payoutCentsCookBefore,
    };
}
