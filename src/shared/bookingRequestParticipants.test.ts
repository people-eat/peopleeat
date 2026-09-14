import { describe, expect, it } from 'vitest';

import { bookingRequestParticipantsFromCounts, bookingRequestParticipantsNormalize } from './bookingRequestParticipants';

describe('bookingRequestParticipantsFromCounts', () => {
    it('seeds default names when no previous participants', () => {
        expect(bookingRequestParticipantsFromCounts({ adultCount: 2, discountedCount: 1, locale: 'de' })).toEqual([
            { type: 'ADULT', name: 'Erwachsener 1', restrictions: [] },
            { type: 'ADULT', name: 'Erwachsener 2', restrictions: [] },
            { type: 'DISCOUNTED', name: 'Kind 1', restrictions: [] },
        ]);
    });

    it('preserves names and restrictions by type index when counts change', () => {
        const previous = [
            { type: 'ADULT' as const, name: 'Alex', restrictions: ['Vegan'] },
            { type: 'ADULT' as const, name: 'Sam', restrictions: ['Nuts'] },
            { type: 'DISCOUNTED' as const, name: 'Kid', restrictions: ['Eggs'] },
        ];
        expect(
            bookingRequestParticipantsFromCounts({
                adultCount: 1,
                discountedCount: 2,
                locale: 'en',
                previous,
            }),
        ).toEqual([
            { type: 'ADULT', name: 'Alex', restrictions: ['Vegan'] },
            { type: 'DISCOUNTED', name: 'Kid', restrictions: ['Eggs'] },
            { type: 'DISCOUNTED', name: 'Child 2', restrictions: [] },
        ]);
    });
});

describe('bookingRequestParticipantsNormalize', () => {
    it('trims names and drops empty restrictions', () => {
        expect(
            bookingRequestParticipantsNormalize([
                { type: 'ADULT', name: '  Alex  ', restrictions: [' Vegan ', '', '  '] },
                { type: 'DISCOUNTED', name: 'Kid', restrictions: ['Eggs'] },
            ]),
        ).toEqual([
            { type: 'ADULT', name: 'Alex', restrictions: ['Vegan'] },
            { type: 'DISCOUNTED', name: 'Kid', restrictions: ['Eggs'] },
        ]);
    });
});
