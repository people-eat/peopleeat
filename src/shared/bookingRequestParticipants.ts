import type { Locale } from './locale';
import { textNormalizeTitled } from './textNormalize';

export type BookingRequestParticipantDraft = {
    type: 'ADULT' | 'DISCOUNTED';
    name: string;
    restrictions: string[];
};

/**
 * Builds / resizes a participant list from adult + child counts while preserving
 * existing names and restrictions by type index when possible.
 */
export function bookingRequestParticipantsFromCounts(input: {
    adultCount: number;
    discountedCount: number;
    locale: Locale;
    previous?: readonly BookingRequestParticipantDraft[];
}): BookingRequestParticipantDraft[] {
    const previousAdults = (input.previous ?? []).filter((participant) => participant.type === 'ADULT');
    const previousDiscounted = (input.previous ?? []).filter((participant) => participant.type === 'DISCOUNTED');

    const adults = Array.from({ length: Math.max(0, input.adultCount) }, (_, index) => {
        const previous = previousAdults[index];
        return {
            type: 'ADULT' as const,
            name: previous?.name ?? { de: `Erwachsener ${index + 1}`, en: `Adult ${index + 1}` }[input.locale],
            restrictions: previous?.restrictions ?? [],
        };
    });

    const discounted = Array.from({ length: Math.max(0, input.discountedCount) }, (_, index) => {
        const previous = previousDiscounted[index];
        return {
            type: 'DISCOUNTED' as const,
            name: previous?.name ?? { de: `Kind ${index + 1}`, en: `Child ${index + 1}` }[input.locale],
            restrictions: previous?.restrictions ?? [],
        };
    });

    return [...adults, ...discounted];
}

/** Normalize names/restrictions (single-line + first letter) and drop empty restriction strings. */
export function bookingRequestParticipantsNormalize(
    participants: readonly BookingRequestParticipantDraft[],
): BookingRequestParticipantDraft[] {
    return participants.map((participant) => ({
        type: participant.type,
        name: textNormalizeTitled(participant.name),
        restrictions: participant.restrictions
            .map((restriction) => textNormalizeTitled(restriction))
            .filter((restriction) => restriction.length > 0),
    }));
}
