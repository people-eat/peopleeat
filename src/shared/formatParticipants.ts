import type { Locale } from './locale';

type FormatParticipantsCounts = {
    adultCount: number;
    discountedCount: number;
};

export type FormatParticipantsInput = ReadonlyArray<{ type: string }> | FormatParticipantsCounts;

export type FormatParticipantsOptions = {
    locale: Locale;
};

function participantCounts(input: FormatParticipantsInput): FormatParticipantsCounts {
    if ('adultCount' in input && 'discountedCount' in input) {
        return input;
    }
    return {
        adultCount: input.filter((participant) => participant.type === 'ADULT').length,
        discountedCount: input.filter((participant) => participant.type === 'DISCOUNTED').length,
    };
}

export function formatParticipants(input: FormatParticipantsInput, options: FormatParticipantsOptions): string {
    const { locale } = options;
    const { adultCount, discountedCount } = participantCounts(input);

    const adultLabel =
        adultCount === 1
            ? { de: '1 Erwachsener', en: '1 adult' }[locale]
            : { de: `${adultCount} Erwachsene`, en: `${adultCount} adults` }[locale];
    if (discountedCount === 0) return adultLabel;

    const discountedLabel =
        discountedCount === 1
            ? { de: '1 Kind', en: '1 child' }[locale]
            : { de: `${discountedCount} Kinder`, en: `${discountedCount} children` }[locale];
    return `${adultLabel}, ${discountedLabel}`;
}
