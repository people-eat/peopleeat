export type GeoCoordinates = {
    latitude: number;
    longitude: number;
};

/** Haversine distance in kilometers (Earth radius 6371 km). */
export function geoDistance(location1: GeoCoordinates, location2: GeoCoordinates): number {
    const radiusEarthKm = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(location2.latitude - location1.latitude);
    const dLon = toRad(location2.longitude - location1.longitude);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(location1.latitude)) * Math.cos(toRad(location2.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radiusEarthKm * c;
}
