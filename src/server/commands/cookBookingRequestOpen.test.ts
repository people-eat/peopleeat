import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, bookingRequests, cooks } from '../db/schema';
import { cookBookingRequestMenuEvaluationGenerateJob } from '../jobs/handlers/cookBookingRequestMenuEvaluationGenerate';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { cookBookingRequestOpen } from './cookBookingRequestOpen';

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

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Open' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
    });
    return setup;
}

async function insertCustomerBookingRequest() {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Anniversary',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: { ...berlin, latitude: 52.53, longitude: 13.41 },
        priceClassType: 'HIGH',
        originalMessage: 'Special dinner',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });
    return { bookingRequestId };
}

describe('cookBookingRequestOpen', () => {
    beforeEach(() => {
        vi.mocked(featureToggleIsEnabled).mockReset();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(false);
    });

    it('inserts a bookingRequestCooks row with firstOpenedAt, stamps travel distance, and publishes', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        vi.mocked(serverRuntime.places.drivingDistanceKm).mockResolvedValue(18.4);

        // Act
        const result = await cookBookingRequestOpen(
            cookMutationParent(user.userId),
            { bookingRequestId },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: bookingRequestId });
        const [details] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(details?.firstOpenedAt).toBeTruthy();
        expect(details?.travelDistanceKm).toBe(18.4);
        expect(details?.menuEvaluationLoading).toBe(false);
        expect(details?.declinedAt).toBeNull();
        expect(serverRuntime.places.drivingDistanceKm).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    });

    it('preserves the original firstOpenedAt on a second open (COALESCE)', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        const first = await cookBookingRequestOpen(cookMutationParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);
        expect(first.success).toBe(true);
        const [before] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        const originalOpenedAt = before!.firstOpenedAt!;

        // Act — re-open after a short delay so a naive overwrite would change the stamp.
        await new Promise((resolve) => setTimeout(resolve, 20));
        await cookBookingRequestOpen(cookMutationParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        // Assert
        const [after] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(after!.firstOpenedAt!.getTime()).toBe(originalOpenedAt.getTime());
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(2);
    });

    it('schedules AI menu evaluation on first open when the toggle is enabled', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(true);

        await cookBookingRequestOpen(cookMutationParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

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
    });

    it('does not re-schedule evaluation when menuEvaluation already exists', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(true);
        await testDb.insert(bookingRequestCooks).values({
            cookId: user.userId,
            bookingRequestId,
            menuEvaluationLoading: false,
            menuEvaluation: {
                evaluationSummary: 'Done',
                menus: [],
                generatedMenu: null,
            },
            firstOpenedAt: new Date(),
        });

        await cookBookingRequestOpen(cookMutationParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        const [details] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(details?.menuEvaluationLoading).toBe(false);
        expect(details?.menuEvaluation?.evaluationSummary).toBe('Done');
    });

    it('rejects a missing booking request without writing or publishing', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const missingId = idCreate();

        // Act + Assert
        await expect(
            cookBookingRequestOpen(cookMutationParent(user.userId), { bookingRequestId: missingId }, requestingSession, serverRuntime),
        ).rejects.toThrow(/booking request not found/);

        const [rows, logRows] = await Promise.all([
            testDb
                .select()
                .from(bookingRequestCooks)
                .where(and(eq(bookingRequestCooks.cookId, user.userId), eq(bookingRequestCooks.bookingRequestId, missingId))),
            findLogsForSession(requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/booking request not found/);
    });
});
