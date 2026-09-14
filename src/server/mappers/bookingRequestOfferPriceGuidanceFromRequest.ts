import { bookingRequestOfferPriceGuidance } from '../../shared/bookingRequestOfferPriceGuidance';
import type { BookingRequestOfferPriceClassType } from '../../shared/bookingRequestOfferPriceGuidance';
import type { BookingRequestParticipant } from '../db/schema';

export function bookingRequestParticipantCounts(participants: Pick<BookingRequestParticipant, 'type'>[]): {
    participantsAdult: number;
    participantsDiscounted: number;
} {
    let participantsAdult = 0;
    let participantsDiscounted = 0;
    for (const participant of participants) {
        if (participant.type === 'ADULT') participantsAdult += 1;
        else participantsDiscounted += 1;
    }
    return { participantsAdult, participantsDiscounted };
}

export function bookingRequestOfferPriceGuidanceFromRequest(input: {
    priceClassType: BookingRequestOfferPriceClassType | null | undefined;
    participants: Pick<BookingRequestParticipant, 'type'>[];
    estimatedTravelExpensesCents?: number | null;
    promoMinimumTotalAmountCustomerCents?: number | null;
}): ReturnType<typeof bookingRequestOfferPriceGuidance> {
    const { participantsAdult, participantsDiscounted } = bookingRequestParticipantCounts(input.participants);
    return bookingRequestOfferPriceGuidance({
        priceClassType: input.priceClassType,
        participantsAdult,
        participantsDiscounted,
        estimatedTravelExpensesCents: input.estimatedTravelExpensesCents ?? 0,
        promoMinimumTotalAmountCustomerCents: input.promoMinimumTotalAmountCustomerCents,
    });
}
