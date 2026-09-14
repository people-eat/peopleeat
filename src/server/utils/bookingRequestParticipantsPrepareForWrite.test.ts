import { describe, expect, it } from 'vitest';

import { featureToggles } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestParticipantsPrepareForWrite } from './bookingRequestParticipantsPrepareForWrite';

describe('bookingRequestParticipantsPrepareForWrite', () => {
    it('trims fields and strips restrictions when the toggle is off', async () => {
        const { serverRuntime } = await commandSetup();
        await testDb
            .insert(featureToggles)
            .values({
                featureToggleKey: 'BOOKING_REQUEST_RESTRICTIONS',
                enabled: false,
            })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: false },
            });

        await expect(
            bookingRequestParticipantsPrepareForWrite(
                [{ type: 'ADULT', name: '  Alex  ', restrictions: [' Vegan ', ''] }],
                serverRuntime,
                'test',
            ),
        ).resolves.toEqual([{ type: 'ADULT', name: 'Alex', restrictions: [] }]);
    });

    it('keeps restrictions when the toggle is on', async () => {
        const { serverRuntime } = await commandSetup();
        await testDb
            .insert(featureToggles)
            .values({
                featureToggleKey: 'BOOKING_REQUEST_RESTRICTIONS',
                enabled: true,
            })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: true },
            });

        await expect(
            bookingRequestParticipantsPrepareForWrite(
                [{ type: 'ADULT', name: 'Alex', restrictions: ['Vegan', ''] }],
                serverRuntime,
                'test',
            ),
        ).resolves.toEqual([{ type: 'ADULT', name: 'Alex', restrictions: ['Vegan'] }]);
    });

    it('rejects empty participant lists and empty names', async () => {
        const { serverRuntime } = await commandSetup();
        await expect(bookingRequestParticipantsPrepareForWrite([], serverRuntime, 'test')).rejects.toThrow(
            'test: at least one participant is required',
        );
        await expect(
            bookingRequestParticipantsPrepareForWrite([{ type: 'ADULT', name: '   ', restrictions: [] }], serverRuntime, 'test'),
        ).rejects.toThrow('test: participant name must not be empty');
    });
});
