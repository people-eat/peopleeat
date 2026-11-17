import type { MapCirclePolygon } from '../../utils/mapCirclePolygon';
import { mapCirclePolygon } from '../../utils/mapCirclePolygon';

export type AdminMapPolygon = MapCirclePolygon;

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
    return mapCirclePolygon(longitude, latitude, radiusKm, steps);
}

export function adminMapEmptyFeatureCollection(): AdminMapFeatureCollection {
    return { type: 'FeatureCollection', features: [] };
}
