import { t } from '../i18n/t';
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

    const adultLabel = t(locale, 'common', 'participants.adults', { count: adultCount });
    if (discountedCount === 0) return adultLabel;

    const discountedLabel = t(locale, 'common', 'participants.children', { count: discountedCount });
    return `${adultLabel}, ${discountedLabel}`;
}
