export type AdminMapPolygon = {
    type: 'Polygon';
    coordinates: [number, number][][];
};

export type AdminMapFeatureCollection = {
    type: 'FeatureCollection';
    features: Array<{
        type: 'Feature';
        properties: Record<string, string | number | boolean | null>;
        geometry: AdminMapPolygon | { type: 'Point'; coordinates: [number, number] };
    }>;
};

/** Approximate circle polygon for MapLibre fill (planar km approximation). */
export function adminMapCirclePolygon(longitude: number, latitude: number, radiusKm: number, steps = 64): AdminMapPolygon {
    const coords: [number, number][] = [];
    const latRad = (latitude * Math.PI) / 180;
    const kmPerDegLat = 110.574;
    const kmPerDegLng = 111.32 * Math.cos(latRad);

    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const dLat = (radiusKm * Math.sin(angle)) / kmPerDegLat;
        const dLng = (radiusKm * Math.cos(angle)) / kmPerDegLng;
        coords.push([longitude + dLng, latitude + dLat]);
    }

    return { type: 'Polygon', coordinates: [coords] };
}

export function adminMapEmptyFeatureCollection(): AdminMapFeatureCollection {
    return { type: 'FeatureCollection', features: [] };
}
