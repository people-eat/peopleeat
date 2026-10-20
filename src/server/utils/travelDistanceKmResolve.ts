import { geoDistance } from '../../shared/geoDistance';
import type { GeoCoordinates } from '../../shared/geoDistance';
import type { Places } from '../places/Places';

/**
 * Preferred travel distance for booking fees: Google Routes driving km when
 * available, otherwise haversine.
 */
export async function travelDistanceKmResolve(places: Places, origin: GeoCoordinates, destination: GeoCoordinates): Promise<number> {
    const drivingKm = await places.drivingDistanceKm({ origin, destination });
    if (drivingKm != null && Number.isFinite(drivingKm) && drivingKm >= 0) {
        return drivingKm;
    }
    return geoDistance(origin, destination);
}
