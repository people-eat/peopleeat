import type { BookingRequestOffer, BookingRequestParticipant } from '../db/schema';
import type { BookingRequestOfferParticipantAmendment } from '../domain/bookingRequest';
import type { GqlSBookingRequestOfferParticipantAmendment } from '../graphql/generated';
import { bookingRequestOfferParticipantAmendmentPriceCalculate } from '../utils/bookingRequestOfferParticipantAmendmentPrice';

export function toGqlBookingRequestOfferParticipantAmendment(input: {
    amendment: BookingRequestOfferParticipantAmendment;
    offer: Pick<
        BookingRequestOffer,
        'menuPriceCents' | 'travelExpensesCents' | 'totalWithoutDiscountsCentsCustomer' | 'totalCentsCustomer' | 'payoutCentsCook'
    >;
    currentParticipants: Pick<BookingRequestParticipant, 'type'>[];
}): GqlSBookingRequestOfferParticipantAmendment {
    const { amendment, offer, currentParticipants } = input;
    const totalCentsCustomerBefore = offer.totalCentsCustomer ?? offer.totalWithoutDiscountsCentsCustomer;
    const price = bookingRequestOfferParticipantAmendmentPriceCalculate(
        {
            menuPriceCentsBefore: offer.menuPriceCents,
            travelExpensesCents: offer.travelExpensesCents,
            totalWithoutDiscountsCentsCustomerBefore: offer.totalWithoutDiscountsCentsCustomer,
            totalCentsCustomerBefore,
            participantsBefore: currentParticipants,
            participantsAfter: amendment.participants,
        },
        offer.payoutCentsCook,
    );

    return {
        requestedAt: new Date(amendment.requestedAt),
        participants: amendment.participants.map((participant) => ({
            type: participant.type,
            name: participant.name,
            restrictions: participant.restrictions,
        })),
        menuPriceCentsBefore: amendment.menuPriceCentsBefore,
        menuPriceCentsAfter: price.menuPriceCentsAfter,
        totalCentsCustomerBefore: amendment.totalCentsCustomerBefore,
        totalCentsCustomerAfter: price.totalCentsCustomerAfter,
        payoutCentsCookBefore: amendment.payoutCentsCookBefore,
        payoutCentsCookAfter: price.payoutCentsCookAfter,
    };
}
