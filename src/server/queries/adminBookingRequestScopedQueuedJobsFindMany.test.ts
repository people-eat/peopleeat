import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestAdjustedMessageGenerate } from '../jobs/handlers/bookingRequestAdjustedMessageGenerate';
import { bookingRequestExpireNotify } from '../jobs/handlers/bookingRequestExpireNotify';
import { bookingRequestNoOffersNotify } from '../jobs/handlers/bookingRequestNoOffersNotify';
import { commandSetup } from '../test/commandTestUtils';
import { adminBookingRequestScopedQueuedJobsFindMany } from './adminBookingRequestOfferQueuedJobsByOfferIdFindMany';

describe('adminBookingRequestScopedQueuedJobsFindMany', () => {
    it('includes pending adjusted-message jobs for the booking request', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Jobs', lastName: 'Admin' });
        const bookingRequestId = idCreate();
        const startAfter = new Date('2030-01-01T12:00:00.000Z');

        vi.mocked(setup.serverRuntime.jobs.findByData).mockImplementation(async (definition) => {
            if (definition === bookingRequestAdjustedMessageGenerate) {
                return [
                    {
                        id: idCreate(),
                        name: bookingRequestAdjustedMessageGenerate.name,
                        data: { bookingRequestId },
                        state: 'created',
                        startAfter,
                    },
                ] as never;
            }
            if (definition === bookingRequestExpireNotify || definition === bookingRequestNoOffersNotify) {
                return [];
            }
            return [];
        });

        const jobs = await adminBookingRequestScopedQueuedJobsFindMany(bookingRequestId, setup.serverRuntime);

        expect(jobs).toHaveLength(1);
        expect(jobs[0]?.name).toBe('booking-request-adjusted-message-generate');
        expect(jobs[0]?.bookingRequestId).toBe(bookingRequestId);
        expect(jobs[0]?.state).toBe('CREATED');
    });
});
