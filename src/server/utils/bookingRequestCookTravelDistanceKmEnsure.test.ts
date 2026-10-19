import { and, eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, bookingRequests, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import {
    bookingRequestCookTravelDistanceKmClear,
    bookingRequestCookTravelDistanceKmEnsure,
} from './bookingRequestCookTravelDistanceKmEnsure';

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

const munich = { latitude: 48.137, longitude: 11.575 };

describe('bookingRequestCookTravelDistanceKmEnsure', () => {
    it('resolves via places, stamps BookingRequestCooks, and reuses the stored value', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Travel' });
        await testDb.insert(cooks).values({
            cookId: setup.user.userId,
            exactTravelOriginAddress: berlin,
            travelExpensesAmount: 25,
            maximumTravelDistance: 100,
        });
        const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Guest' });
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: { ...berlin, latitude: munich.latitude, longitude: munich.longitude, city: 'München' },
            priceClassType: 'MEDIUM',
            originalMessage: 'Hello',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        vi.mocked(setup.serverRuntime.places.drivingDistanceKm).mockResolvedValue(584.2);

        const first = await bookingRequestCookTravelDistanceKmEnsure(setup.serverRuntime, {
            cookId: setup.user.userId,
            bookingRequestId,
            origin: { latitude: berlin.latitude, longitude: berlin.longitude },
            destination: munich,
        });
        expect(first).toBe(584.2);
        expect(setup.serverRuntime.places.drivingDistanceKm).toHaveBeenCalledTimes(1);

        const [row] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, setup.user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(row?.travelDistanceKm).toBe(584.2);

        vi.mocked(setup.serverRuntime.places.drivingDistanceKm).mockResolvedValue(999);

        const second = await bookingRequestCookTravelDistanceKmEnsure(setup.serverRuntime, {
            cookId: setup.user.userId,
            bookingRequestId,
            origin: { latitude: berlin.latitude, longitude: berlin.longitude },
            destination: munich,
            existingTravelDistanceKm: row?.travelDistanceKm ?? null,
        });
        expect(second).toBe(584.2);
        expect(setup.serverRuntime.places.drivingDistanceKm).toHaveBeenCalledTimes(1);
    });

    it('clears stamped distances so the next ensure re-resolves', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Clear' });
        await testDb.insert(cooks).values({ cookId: setup.user.userId, exactTravelOriginAddress: berlin });
        const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Clear' });
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Hello',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestCooks).values({
            cookId: setup.user.userId,
            bookingRequestId,
            menuEvaluationLoading: false,
            travelDistanceKm: 42,
        });

        await bookingRequestCookTravelDistanceKmClear(setup.serverRuntime, { bookingRequestId });

        const [cleared] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, setup.user.userId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));
        expect(cleared?.travelDistanceKm).toBeNull();

        vi.mocked(setup.serverRuntime.places.drivingDistanceKm).mockResolvedValue(12.5);
        const next = await bookingRequestCookTravelDistanceKmEnsure(setup.serverRuntime, {
            cookId: setup.user.userId,
            bookingRequestId,
            origin: { latitude: berlin.latitude, longitude: berlin.longitude },
            destination: { latitude: berlin.latitude, longitude: berlin.longitude },
            existingTravelDistanceKm: null,
        });
        expect(next).toBe(12.5);
    });
});
