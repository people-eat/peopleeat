import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { featureToggles } from '../db/schema';
import { bookingRequestAdjustedMessageGenerate } from '../jobs/handlers/bookingRequestAdjustedMessageGenerate';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestAdjustedMessageGenerateScheduleIfEnabled } from './bookingRequestAdjustedMessageGenerateSchedule';

describe('bookingRequestAdjustedMessageGenerateScheduleIfEnabled', () => {
    it('enqueues when the toggle is on and the message is non-empty', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Schedule', lastName: 'On' });
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'AI_BOOKING_REQUEST_MESSAGE', enabled: true })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: true },
            });
        const bookingRequestId = idCreate();
        vi.mocked(setup.serverRuntime.jobs.enqueue).mockClear();

        await bookingRequestAdjustedMessageGenerateScheduleIfEnabled(setup.serverRuntime, {
            bookingRequestId,
            userId: setup.user.userId,
            originalMessage: 'Hello chef',
        });

        expect(setup.serverRuntime.jobs.enqueue).toHaveBeenCalledWith(bookingRequestAdjustedMessageGenerate, {
            bookingRequestId,
        });
    });

    it('does not enqueue when the toggle is off', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Schedule', lastName: 'Off' });
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'AI_BOOKING_REQUEST_MESSAGE', enabled: false })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: false },
            });
        vi.mocked(setup.serverRuntime.jobs.enqueue).mockClear();

        await bookingRequestAdjustedMessageGenerateScheduleIfEnabled(setup.serverRuntime, {
            bookingRequestId: idCreate(),
            userId: setup.user.userId,
            originalMessage: 'Hello chef',
        });

        expect(setup.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    });

    it('does not enqueue when the message is empty', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Schedule', lastName: 'Empty' });
        await testDb
            .insert(featureToggles)
            .values({ featureToggleKey: 'AI_BOOKING_REQUEST_MESSAGE', enabled: true })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: { enabled: true },
            });
        vi.mocked(setup.serverRuntime.jobs.enqueue).mockClear();

        await bookingRequestAdjustedMessageGenerateScheduleIfEnabled(setup.serverRuntime, {
            bookingRequestId: idCreate(),
            userId: setup.user.userId,
            originalMessage: '   ',
        });

        expect(setup.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    });
});
