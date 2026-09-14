import { geoDistance } from '../../shared/geoDistance';
import type { GeoCoordinates } from '../../shared/geoDistance';
import type { Cook } from '../db/schema';

/** Pure travel-radius check (origin + max distance). Visibility / approval are call-site concerns. */
export function cookIsInTravelRadius(cook: Cook, eventLocation: GeoCoordinates): boolean {
    const origin = cook.exactTravelOriginAddress;
    if (!origin) {
        return false;
    }
    if (cook.maximumTravelDistance == null) {
        return true;
    }
    const distanceKm = geoDistance({ latitude: origin.latitude, longitude: origin.longitude }, eventLocation);
    return distanceKm <= cook.maximumTravelDistance;
}
