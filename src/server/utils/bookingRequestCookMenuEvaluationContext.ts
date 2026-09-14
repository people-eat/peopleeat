import { formatParticipants } from '../../shared';
import type { BookingRequest, BookingRequestParticipant } from '../db/schema';

/** Plain-text booking-request context for AI menu evaluation / inventory suggestion. */
export function bookingRequestCookMenuEvaluationContextBuild(input: {
    bookingRequest: Pick<BookingRequest, 'occasion' | 'preferences' | 'adjustedMessage' | 'originalMessage'>;
    participants: BookingRequestParticipant[];
}): string {
    const { bookingRequest, participants } = input;
    const adultCount = participants.filter((participant) => participant.type === 'ADULT').length;
    const discountedCount = participants.filter((participant) => participant.type === 'DISCOUNTED').length;
    const message = (bookingRequest.adjustedMessage ?? bookingRequest.originalMessage).trim();
    const preferences = bookingRequest.preferences.join(', ');

    return [
        '## Buchungsanfrage',
        `-Anlass: ${bookingRequest.occasion}`,
        `-Präferenzen: ${preferences.length > 0 ? preferences : 'Keine'}`,
        `-Teilnehmer: ${formatParticipants({ adultCount, discountedCount }, { locale: 'de' })}`,
        `-Nachricht: ${message.length > 0 ? message : 'Keine'}`,
    ].join('\n');
}
