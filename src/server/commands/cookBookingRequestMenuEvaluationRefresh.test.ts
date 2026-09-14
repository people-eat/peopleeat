import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, bookingRequests, cooks } from '../db/schema';
import { cookBookingRequestMenuEvaluationGenerateJob } from '../jobs/handlers/cookBookingRequestMenuEvaluationGenerate';
import { commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { cookBookingRequestMenuEvaluationRefresh } from './cookBookingRequestMenuEvaluationRefresh';

vi.mock('../utils/featureToggleIsEnabled', () => ({
    featureToggleIsEnabled: vi.fn(async () => false),
}));

const berlin = {
    displayText: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10115',
    state: 'BE',
    country: 'DE',
};

async function setupCookWithOpenRequest() {
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Refresh' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: { ...berlin, latitude: 52.53, longitude: 13.41 },
        priceClassType: 'HIGH',
        originalMessage: 'Party dinner',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    await testDb.insert(bookingRequestCooks).values({
        cookId: setup.user.userId,
        bookingRequestId,
        menuEvaluationLoading: false,
        menuEvaluation: {
            evaluationSummary: 'Old summary',
            menus: [],
            generatedMenu: null,
        },
        firstOpenedAt: new Date(),
    });
    return { ...setup, bookingRequestId };
}

describe('cookBookingRequestMenuEvaluationRefresh', () => {
    beforeEach(() => {
        vi.mocked(featureToggleIsEnabled).mockReset();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(false);
    });

    it('rejects when AI_MENU_EVALUATION is disabled', async () => {
        const { serverRuntime, requestingSession, user, bookingRequestId } = await setupCookWithOpenRequest();

        await expect(
            cookBookingRequestMenuEvaluationRefresh(
                cookMutationParent(user.userId),
                { bookingRequestId },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/AI_MENU_EVALUATION is disabled/);

        expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    });

    it('clears evaluation, sets loading, and enqueues the job when the toggle is on', async () => {
        const { serverRuntime, requestingSession, user, bookingRequestId } = await setupCookWithOpenRequest();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(true);

        const result = await cookBookingRequestMenuEvaluationRefresh(
            cookMutationParent(user.userId),
            { bookingRequestId },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: bookingRequestId });
        const [details] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(details?.menuEvaluationLoading).toBe(true);
        expect(details?.menuEvaluation).toBeNull();
        expect(serverRuntime.jobs.enqueue).toHaveBeenCalledWith(cookBookingRequestMenuEvaluationGenerateJob, {
            cookId: user.userId,
            bookingRequestId,
        });
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(vi.mocked(serverRuntime.jobs.findByData)).toHaveBeenCalled();
    });
});
