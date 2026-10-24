import type { BookingRequestOffer, BookingRequestParticipant } from '../db/schema';
import type { BookingRequestExactEventAddress, BookingRequestOfferParticipantAmendment } from '../domain/bookingRequest';
import type { GqlSBookingRequestOfferParticipantAmendment } from '../graphql/generated';
import { bookingRequestOfferParticipantAmendmentPriceCalculate } from '../utils/bookingRequestOfferParticipantAmendmentPrice';

function toGqlAddress(address: BookingRequestExactEventAddress) {
    return {
        displayText: address.displayText,
        latitude: address.latitude,
        longitude: address.longitude,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        postCode: address.postCode,
        state: address.state,
        country: address.country,
    };
}

export function toGqlBookingRequestOfferParticipantAmendment(input: {
    amendment: BookingRequestOfferParticipantAmendment;
    offer: Pick<
        BookingRequestOffer,
        | 'menuPriceCents'
        | 'travelExpensesCents'
        | 'totalWithoutDiscountsCentsCustomer'
        | 'totalCentsCustomer'
        | 'payoutCentsCook'
        | 'giftCardAppliedCents'
        | 'platformFeePercentCook'
        | 'platformFeePercentCustomer'
    >;
    currentParticipants: Pick<BookingRequestParticipant, 'type' | 'name' | 'restrictions'>[];
    /** Precomputed travel after for venue proposals (cook rate × distance). */
    travelExpensesCentsAfter?: number;
    giftCardBalanceCents?: number;
    promoAmountCents?: number;
}): GqlSBookingRequestOfferParticipantAmendment {
    const { amendment, offer, currentParticipants } = input;
    const participantsAfter = amendment.participants ?? currentParticipants;
    const headcountChanged =
        amendment.participants != null &&
        (currentParticipants.filter((p) => p.type === 'ADULT').length !== participantsAfter.filter((p) => p.type === 'ADULT').length ||
            currentParticipants.filter((p) => p.type === 'DISCOUNTED').length !==
                participantsAfter.filter((p) => p.type === 'DISCOUNTED').length);

    const totalCentsCustomerBefore = offer.totalCentsCustomer ?? offer.totalWithoutDiscountsCentsCustomer;
    const travelExpensesCentsAfter = amendment.travelExpensesCentsAfter ?? input.travelExpensesCentsAfter ?? offer.travelExpensesCents;
    const price = bookingRequestOfferParticipantAmendmentPriceCalculate(
        {
            menuPriceCentsBefore: offer.menuPriceCents,
            travelExpensesCentsAfter,
            totalWithoutDiscountsCentsCustomerBefore: offer.totalWithoutDiscountsCentsCustomer,
            totalCentsCustomerBefore,
            giftCardAppliedCentsBefore: offer.giftCardAppliedCents,
            giftCardBalanceCents: input.giftCardBalanceCents ?? 0,
            promoAmountCents: input.promoAmountCents ?? 0,
            participantsBefore: currentParticipants,
            participantsAfter,
            scaleMenuByParticipants: headcountChanged && amendment.menuPriceCentsAfter == null,
            menuPriceCentsOverride: amendment.menuPriceCentsAfter,
            platformFeePercentCook: amendment.platformFeePercentCookAfter ?? offer.platformFeePercentCook,
            platformFeePercentCustomer: amendment.platformFeePercentCustomerAfter ?? offer.platformFeePercentCustomer,
        },
        offer.payoutCentsCook,
    );

    return {
        requestedAt: new Date(amendment.requestedAt),
        participants: amendment.participants
            ? amendment.participants.map((participant) => ({
                  type: participant.type,
                  name: participant.name,
                  restrictions: participant.restrictions,
              }))
            : null,
        exactEventAddress: amendment.exactEventAddress ? toGqlAddress(amendment.exactEventAddress) : null,
        menuPriceCentsBefore: amendment.menuPriceCentsBefore,
        menuPriceCentsAfter: price.menuPriceCentsAfter,
        // Legacy pending JSON (pre–venue amendments) omitted travel snapshots.
        travelExpensesCentsBefore: amendment.travelExpensesCentsBefore ?? offer.travelExpensesCents,
        travelExpensesCentsAfter: price.travelExpensesCents,
        totalCentsCustomerBefore: amendment.totalCentsCustomerBefore,
        totalCentsCustomerAfter: price.totalCentsCustomerAfter,
        payoutCentsCookBefore: amendment.payoutCentsCookBefore,
        payoutCentsCookAfter: price.payoutCentsCookAfter,
        giftCardDeltaCents: price.giftCardDeltaCents,
    };
}
