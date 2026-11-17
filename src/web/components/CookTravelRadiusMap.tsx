import type { GeoJSONSource, LngLatBoundsLike } from 'maplibre-gl';
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useRef } from 'react';

import 'maplibre-gl/dist/maplibre-gl.css';

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { cn } from '../utils/cn';
import { mapCirclePolygon } from '../utils/mapCirclePolygon';

// Vite serves the worker from a hashed URL; MapLibre's default sibling resolve breaks in dev.
setWorkerUrl(maplibreWorkerUrl);

// Flat light basemap via OpenFreeMap (no API key). Same tiles as the admin map.
const BASEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

const ORIGIN_SOURCE_ID = 'cook-travel-origin';
const RADIUS_SOURCE_ID = 'cook-travel-radius';

type CookTravelRadiusMapProps = {
    latitude: number;
    longitude: number;
    radiusKm: number | null;
    className?: string;
};

type EmptyFeatureCollection = {
    type: 'FeatureCollection';
    features: [];
};

type PointFeatureCollection = {
    type: 'FeatureCollection';
    features: Array<{
        type: 'Feature';
        properties: Record<string, never>;
        geometry: { type: 'Point'; coordinates: [number, number] };
    }>;
};

type PolygonFeatureCollection = {
    type: 'FeatureCollection';
    features: Array<{
        type: 'Feature';
        properties: Record<string, never>;
        geometry: ReturnType<typeof mapCirclePolygon>;
    }>;
};

function emptyFeatureCollection(): EmptyFeatureCollection {
    return { type: 'FeatureCollection', features: [] };
}

function originFeatureCollection(longitude: number, latitude: number): PointFeatureCollection {
    return {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {},
                geometry: { type: 'Point', coordinates: [longitude, latitude] },
            },
        ],
    };
}

function radiusFeatureCollection(
    longitude: number,
    latitude: number,
    radiusKm: number | null,
): PolygonFeatureCollection | EmptyFeatureCollection {
    if (radiusKm == null || radiusKm <= 0) return emptyFeatureCollection();
    return {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {},
                geometry: mapCirclePolygon(longitude, latitude, radiusKm),
            },
        ],
    };
}

function setSourceData(
    map: MapLibreMap,
    sourceId: string,
    data: PointFeatureCollection | PolygonFeatureCollection | EmptyFeatureCollection,
) {
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (source) {
        source.setData(data);
    }
}

function ensureLayers(map: MapLibreMap) {
    if (!map.getSource(RADIUS_SOURCE_ID)) {
        map.addSource(RADIUS_SOURCE_ID, {
            type: 'geojson',
            data: emptyFeatureCollection(),
        });
    }
    if (!map.getLayer('cook-travel-radius-fill')) {
        map.addLayer({
            id: 'cook-travel-radius-fill',
            type: 'fill',
            source: RADIUS_SOURCE_ID,
            paint: {
                'fill-color': '#ff8a05',
                'fill-opacity': 0.14,
            },
        });
    }
    if (!map.getLayer('cook-travel-radius-line')) {
        map.addLayer({
            id: 'cook-travel-radius-line',
            type: 'line',
            source: RADIUS_SOURCE_ID,
            paint: {
                'line-color': '#ff8a05',
                'line-width': 1.5,
                'line-opacity': 0.75,
            },
        });
    }

    if (!map.getSource(ORIGIN_SOURCE_ID)) {
        map.addSource(ORIGIN_SOURCE_ID, {
            type: 'geojson',
            data: emptyFeatureCollection(),
        });
    }
    if (!map.getLayer('cook-travel-origin-halo')) {
        map.addLayer({
            id: 'cook-travel-origin-halo',
            type: 'circle',
            source: ORIGIN_SOURCE_ID,
            paint: {
                'circle-color': '#ff8a05',
                'circle-radius': 14,
                'circle-opacity': 0.18,
            },
        });
    }
    if (!map.getLayer('cook-travel-origin-point')) {
        map.addLayer({
            id: 'cook-travel-origin-point',
            type: 'circle',
            source: ORIGIN_SOURCE_ID,
            paint: {
                'circle-color': '#ff8a05',
                'circle-radius': 7,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
            },
        });
    }
}

function fitCamera(map: MapLibreMap, longitude: number, latitude: number, radiusKm: number | null, reducedMotion: boolean) {
    const duration = reducedMotion ? 0 : 600;
    if (radiusKm == null || radiusKm <= 0) {
        map.easeTo({ center: [longitude, latitude], zoom: 10, duration });
        return;
    }

    const polygon = mapCirclePolygon(longitude, latitude, radiusKm);
    const ring = polygon.coordinates[0] ?? [];
    if (ring.length === 0) {
        map.easeTo({ center: [longitude, latitude], zoom: 10, duration });
        return;
    }

    let minLng = ring[0]![0];
    let maxLng = ring[0]![0];
    let minLat = ring[0]![1];
    let maxLat = ring[0]![1];
    for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }

    const bounds: LngLatBoundsLike = [
        [minLng, minLat],
        [maxLng, maxLat],
    ];
    map.fitBounds(bounds, { padding: 40, duration, maxZoom: 11 });
}

export function CookTravelRadiusMap({ latitude, longitude, radiusKm, className }: CookTravelRadiusMapProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const lastFitKeyRef = useRef<string | null>(null);
    const reducedMotion = usePrefersReducedMotion();
    const propsRef = useRef({ latitude, longitude, radiusKm, reducedMotion });
    propsRef.current = { latitude, longitude, radiusKm, reducedMotion };

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const container = containerRef.current;
        const map = new MapLibreMap({
            container,
            style: BASEMAP_STYLE_URL,
            center: [longitude, latitude],
            zoom: 8,
        });
        map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
        mapRef.current = map;

        function syncDataAndCamera(animate: boolean) {
            const current = propsRef.current;
            setSourceData(map, ORIGIN_SOURCE_ID, originFeatureCollection(current.longitude, current.latitude));
            setSourceData(map, RADIUS_SOURCE_ID, radiusFeatureCollection(current.longitude, current.latitude, current.radiusKm));

            const fitKey = `${current.longitude},${current.latitude},${current.radiusKm ?? ''}`;
            if (lastFitKeyRef.current === fitKey) return;
            lastFitKeyRef.current = fitKey;
            fitCamera(map, current.longitude, current.latitude, current.radiusKm, animate ? current.reducedMotion : true);
        }

        map.on('load', () => {
            ensureLayers(map);
            syncDataAndCamera(false);
        });

        const resizeObserver = new ResizeObserver(() => {
            map.resize();
        });
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            map.remove();
            mapRef.current = null;
            lastFitKeyRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        setSourceData(map, ORIGIN_SOURCE_ID, originFeatureCollection(longitude, latitude));
        setSourceData(map, RADIUS_SOURCE_ID, radiusFeatureCollection(longitude, latitude, radiusKm));

        const fitKey = `${longitude},${latitude},${radiusKm ?? ''}`;
        if (lastFitKeyRef.current === fitKey) return;
        lastFitKeyRef.current = fitKey;
        fitCamera(map, longitude, latitude, radiusKm, reducedMotion);
    }, [latitude, longitude, radiusKm, reducedMotion]);

    return (
        <div
            className={cn(
                'relative min-h-[50vh] overflow-hidden rounded-lg border border-border bg-muted/30 [&_.maplibregl-ctrl-attrib]:text-[10px]',
                className,
            )}
        >
            <div ref={containerRef} className="absolute inset-0" />
        </div>
    );
}
