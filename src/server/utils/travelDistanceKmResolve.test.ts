import { describe, expect, it, vi } from 'vitest';

import type { Places } from '../places/Places';
import { travelDistanceKmResolve } from './travelDistanceKmResolve';

const berlin = { latitude: 52.52, longitude: 13.405 };
const munich = { latitude: 48.137, longitude: 11.575 };

describe('travelDistanceKmResolve', () => {
    it('prefers Google driving distance when available', async () => {
        const places: Places = {
            locationSuggestions: vi.fn(),
            geoCoordinatesForCity: vi.fn(),
            drivingDistanceKm: vi.fn(async () => 584.2),
        };

        const km = await travelDistanceKmResolve(places, berlin, munich);
        expect(km).toBe(584.2);
        expect(places.drivingDistanceKm).toHaveBeenCalledWith({ origin: berlin, destination: munich });
    });

    it('falls back to haversine when Routes API returns null', async () => {
        const places: Places = {
            locationSuggestions: vi.fn(),
            geoCoordinatesForCity: vi.fn(),
            drivingDistanceKm: vi.fn(async () => null),
        };

        const km = await travelDistanceKmResolve(places, berlin, munich);
        expect(km).toBeGreaterThan(400);
        expect(km).toBeLessThan(600);
    });
});
