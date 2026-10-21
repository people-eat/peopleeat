import {
    bookingRequestOfferMenuPriceScaleByPaidParticipants,
    bookingRequestOfferPriceCalculate,
} from '../../shared/bookingRequestOfferPrice';
import { bookingRequestPaidParticipants } from '../../shared/bookingRequestOfferPriceGuidance';
import type { BookingRequestParticipantType } from '../domain/bookingRequest';

export type BookingRequestOfferParticipantAmendmentPriceInput = {
    menuPriceCentsBefore: number;
    travelExpensesCents: number;
    totalWithoutDiscountsCentsCustomerBefore: number;
    totalCentsCustomerBefore: number;
    participantsBefore: { type: BookingRequestParticipantType }[];
    participantsAfter: { type: BookingRequestParticipantType }[];
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
 * Scale locked menu total by paid-headcount ratio and recompute fee snapshot.
 * Gift / promo stay as the fixed discount already baked into `totalCentsCustomerBefore`
 * (gift ledger is not restored on decrease).
 */
export function bookingRequestOfferParticipantAmendmentPriceCalculate(
    input: BookingRequestOfferParticipantAmendmentPriceInput,
    payoutCentsCookBefore: number,
): BookingRequestOfferParticipantAmendmentPriceResult {
    const before = participantCounts(input.participantsBefore);
    const after = participantCounts(input.participantsAfter);
    const paidParticipantsBefore = bookingRequestPaidParticipants(before.adults, before.discounted);
    const paidParticipantsAfter = bookingRequestPaidParticipants(after.adults, after.discounted);

    const menuPriceCentsAfter = bookingRequestOfferMenuPriceScaleByPaidParticipants({
        menuPriceCents: input.menuPriceCentsBefore,
        paidParticipantsBefore,
        paidParticipantsAfter,
    });
    const price = bookingRequestOfferPriceCalculate({
        menuPriceCents: menuPriceCentsAfter,
        travelExpensesCents: input.travelExpensesCents,
    });
    const discountCents = Math.max(0, input.totalWithoutDiscountsCentsCustomerBefore - input.totalCentsCustomerBefore);
    const totalCentsCustomerAfter = Math.max(0, price.totalWithoutDiscountsCentsCustomer - discountCents);

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
        totalCentsCustomerAfter,
        customerDeltaCents: totalCentsCustomerAfter - input.totalCentsCustomerBefore,
        cookPayoutDeltaCents: price.payoutCentsCook - payoutCentsCookBefore,
    };
}
