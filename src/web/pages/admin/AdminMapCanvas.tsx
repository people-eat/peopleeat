import type { ExpressionSpecification, GeoJSONSource, LngLat, MapGeoJSONFeature, MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl';
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useRef } from 'react';

import 'maplibre-gl/dist/maplibre-gl.css';

import type {
    GqlCAdminMapBookingRequestPoint,
    GqlCAdminMapCityPoint,
    GqlCAdminMapCookPoint,
    GqlCAdminMapPartnerVenuePoint,
} from '../../graphql/generated';
import type { AdminMapFeatureCollection } from './adminMapGeo';
import { adminMapCirclePolygon, adminMapEmptyFeatureCollection } from './adminMapGeo';
import type { AdminMapFocus, AdminMapLayer } from './adminMapSearch';

// Vite serves the worker from a hashed URL; MapLibre's default sibling resolve breaks in dev.
setWorkerUrl(maplibreWorkerUrl);

type MapFeatureProperties = Record<string, string | number | boolean | null> | null;

// Flat light basemap via OpenFreeMap (no API key). Pins stay primary over low-contrast roads/labels.
const BASEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

const COOK_COLOR_EXPR: ExpressionSpecification = ['match', ['get', 'mapStatus'], 'LISTABLE', '#16a34a', 'PENDING', '#d97706', '#6b7280'];

export type AdminMapCoverageCook = {
    cookId: string;
    latitude: number;
    longitude: number;
    maximumTravelDistance: number | null;
};

type AdminMapCanvasProps = {
    cooks: readonly GqlCAdminMapCookPoint[];
    bookingRequests: readonly GqlCAdminMapBookingRequestPoint[];
    cities: readonly GqlCAdminMapCityPoint[];
    partnerVenues: readonly GqlCAdminMapPartnerVenuePoint[];
    layers: ReadonlySet<AdminMapLayer>;
    focus: AdminMapFocus | null;
    coverageCooks: readonly AdminMapCoverageCook[];
    onFocusChange: (focus: AdminMapFocus | null) => void;
};

function cookFeatures(cooks: readonly GqlCAdminMapCookPoint[]): AdminMapFeatureCollection {
    return {
        type: 'FeatureCollection',
        features: cooks.map((cook) => ({
            type: 'Feature' as const,
            properties: {
                layer: 'cook',
                entityId: cook.cookId,
                mapStatus: cook.mapStatus,
                displayName: cook.displayName,
                maximumTravelDistance: cook.maximumTravelDistance ?? null,
            },
            geometry: { type: 'Point' as const, coordinates: [cook.longitude, cook.latitude] as [number, number] },
        })),
    };
}

function bookingFeatures(bookings: readonly GqlCAdminMapBookingRequestPoint[]): AdminMapFeatureCollection {
    return {
        type: 'FeatureCollection',
        features: bookings.map((booking) => ({
            type: 'Feature' as const,
            properties: {
                layer: 'booking',
                entityId: booking.bookingRequestId,
                status: booking.status,
                occasion: booking.occasion,
            },
            geometry: { type: 'Point' as const, coordinates: [booking.longitude, booking.latitude] as [number, number] },
        })),
    };
}

function cityFeatures(cities: readonly GqlCAdminMapCityPoint[]): AdminMapFeatureCollection {
    return {
        type: 'FeatureCollection',
        features: cities.map((city) => ({
            type: 'Feature' as const,
            properties: {
                layer: 'city',
                entityId: city.cityId,
                published: city.published,
                nameDe: city.nameDe,
                nameEn: city.nameEn,
            },
            geometry: { type: 'Point' as const, coordinates: [city.longitude, city.latitude] as [number, number] },
        })),
    };
}

function venueFeatures(partnerVenues: readonly GqlCAdminMapPartnerVenuePoint[]): AdminMapFeatureCollection {
    return {
        type: 'FeatureCollection',
        features: partnerVenues.map((venue) => ({
            type: 'Feature' as const,
            properties: {
                layer: 'venue',
                entityId: venue.partnerVenueId,
                published: venue.published,
                name: venue.name,
            },
            geometry: { type: 'Point' as const, coordinates: [venue.longitude, venue.latitude] as [number, number] },
        })),
    };
}

function placeFeatures(place: AdminMapFocus | null): AdminMapFeatureCollection {
    if (place?.kind !== 'place') return adminMapEmptyFeatureCollection();
    return {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {
                    layer: 'place',
                    label: place.label,
                    latitude: place.latitude,
                    longitude: place.longitude,
                },
                geometry: { type: 'Point', coordinates: [place.longitude, place.latitude] },
            },
        ],
    };
}

function radiusFeatures(args: {
    cooks: readonly GqlCAdminMapCookPoint[];
    focus: AdminMapFocus | null;
    coverageCooks: readonly AdminMapCoverageCook[];
    hoverCookId: string | null;
}): AdminMapFeatureCollection {
    const features: AdminMapFeatureCollection['features'] = [];
    const seen = new Set<string>();

    function addCircle(cookId: string, longitude: number, latitude: number, maximumTravelDistance: number | null) {
        if (maximumTravelDistance == null || maximumTravelDistance <= 0) return;
        if (seen.has(cookId)) return;
        seen.add(cookId);
        features.push({
            type: 'Feature',
            properties: { cookId },
            geometry: adminMapCirclePolygon(longitude, latitude, maximumTravelDistance),
        });
    }

    const focused = args.focus;
    if (focused?.kind === 'cook') {
        const cook = args.cooks.find((row) => row.cookId === focused.id);
        if (cook) addCircle(cook.cookId, cook.longitude, cook.latitude, cook.maximumTravelDistance ?? null);
    }

    if (args.hoverCookId) {
        const cook = args.cooks.find((row) => row.cookId === args.hoverCookId);
        if (cook) addCircle(cook.cookId, cook.longitude, cook.latitude, cook.maximumTravelDistance ?? null);
    }

    for (const cook of args.coverageCooks) {
        addCircle(cook.cookId, cook.longitude, cook.latitude, cook.maximumTravelDistance);
        if (features.length >= 25) break;
    }

    return { type: 'FeatureCollection', features };
}

function setSourceData(map: MapLibreMap, sourceId: string, data: AdminMapFeatureCollection) {
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (source) {
        source.setData(data);
    }
}

function ensureClusteredPointLayers(map: MapLibreMap, sourceId: string, color: ExpressionSpecification | string, circleRadius = 7) {
    if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
            type: 'geojson',
            data: adminMapEmptyFeatureCollection(),
            cluster: true,
            clusterMaxZoom: 12,
            clusterRadius: 48,
        });
    }

    const clustersId = `${sourceId}-clusters`;
    const clusterCountId = `${sourceId}-cluster-count`;
    const pointsId = `${sourceId}-points`;

    if (!map.getLayer(clustersId)) {
        map.addLayer({
            id: clustersId,
            type: 'circle',
            source: sourceId,
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': typeof color === 'string' ? color : '#334155',
                'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26],
                'circle-opacity': 0.85,
            },
        });
    }

    if (!map.getLayer(clusterCountId)) {
        map.addLayer({
            id: clusterCountId,
            type: 'symbol',
            source: sourceId,
            filter: ['has', 'point_count'],
            layout: {
                'text-field': ['get', 'point_count_abbreviated'],
                'text-size': 12,
            },
            paint: {
                'text-color': '#ffffff',
            },
        });
    }

    if (!map.getLayer(pointsId)) {
        map.addLayer({
            id: pointsId,
            type: 'circle',
            source: sourceId,
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': color,
                'circle-radius': circleRadius,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#ffffff',
            },
        });
    }
}

function ensureSimplePointLayers(map: MapLibreMap, sourceId: string, color: ExpressionSpecification | string) {
    if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
            type: 'geojson',
            data: adminMapEmptyFeatureCollection(),
        });
    }

    const pointsId = `${sourceId}-points`;
    if (!map.getLayer(pointsId)) {
        map.addLayer({
            id: pointsId,
            type: 'circle',
            source: sourceId,
            paint: {
                'circle-color': color,
                'circle-radius': 8,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#ffffff',
            },
        });
    }
}

function ensurePlaceLayers(map: MapLibreMap) {
    if (!map.getSource('place')) {
        map.addSource('place', {
            type: 'geojson',
            data: adminMapEmptyFeatureCollection(),
        });
    }
    if (!map.getLayer('place-halo')) {
        map.addLayer({
            id: 'place-halo',
            type: 'circle',
            source: 'place',
            paint: {
                'circle-color': '#e11d48',
                'circle-radius': 14,
                'circle-opacity': 0.18,
            },
        });
    }
    if (!map.getLayer('place-points')) {
        map.addLayer({
            id: 'place-points',
            type: 'circle',
            source: 'place',
            paint: {
                'circle-color': '#e11d48',
                'circle-radius': 8,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
            },
        });
    }
}

function ensureRadiusLayers(map: MapLibreMap) {
    if (!map.getSource('radius')) {
        map.addSource('radius', {
            type: 'geojson',
            data: adminMapEmptyFeatureCollection(),
        });
    }
    if (!map.getLayer('radius-fill')) {
        map.addLayer({
            id: 'radius-fill',
            type: 'fill',
            source: 'radius',
            paint: {
                'fill-color': '#2563eb',
                'fill-opacity': 0.12,
            },
        });
    }
    if (!map.getLayer('radius-line')) {
        map.addLayer({
            id: 'radius-line',
            type: 'line',
            source: 'radius',
            paint: {
                'line-color': '#2563eb',
                'line-width': 1.5,
                'line-opacity': 0.7,
            },
        });
    }
}

function setLayerVisibility(map: MapLibreMap, layerIds: string[], visible: boolean) {
    for (const layerId of layerIds) {
        if (!map.getLayer(layerId)) continue;
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }
}

export function AdminMapCanvas({
    cooks,
    bookingRequests,
    cities,
    partnerVenues,
    layers,
    focus,
    coverageCooks,
    onFocusChange,
}: AdminMapCanvasProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const hoverCookIdRef = useRef<string | null>(null);
    const lastFlownKeyRef = useRef<string | null>(null);
    const propsRef = useRef({ cooks, bookingRequests, cities, partnerVenues, layers, focus, coverageCooks, onFocusChange });
    propsRef.current = { cooks, bookingRequests, cities, partnerVenues, layers, focus, coverageCooks, onFocusChange };

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new MapLibreMap({
            container: containerRef.current,
            style: BASEMAP_STYLE_URL,
            center: [10.45, 51.16],
            zoom: 5.4,
            attributionControl: false,
        });
        map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
        mapRef.current = map;

        function syncData() {
            const current = propsRef.current;
            setSourceData(map, 'cooks', current.layers.has('cooks') ? cookFeatures(current.cooks) : adminMapEmptyFeatureCollection());
            setSourceData(
                map,
                'bookings',
                current.layers.has('bookings') ? bookingFeatures(current.bookingRequests) : adminMapEmptyFeatureCollection(),
            );
            setSourceData(map, 'cities', current.layers.has('cities') ? cityFeatures(current.cities) : adminMapEmptyFeatureCollection());
            setSourceData(
                map,
                'venues',
                current.layers.has('venues') ? venueFeatures(current.partnerVenues) : adminMapEmptyFeatureCollection(),
            );
            setSourceData(
                map,
                'radius',
                radiusFeatures({
                    cooks: current.cooks,
                    focus: current.focus,
                    coverageCooks: current.coverageCooks,
                    hoverCookId: hoverCookIdRef.current,
                }),
            );
            setSourceData(map, 'place', placeFeatures(current.focus));
            setLayerVisibility(map, ['cooks-clusters', 'cooks-cluster-count', 'cooks-points'], current.layers.has('cooks'));
            setLayerVisibility(map, ['bookings-clusters', 'bookings-cluster-count', 'bookings-points'], current.layers.has('bookings'));
            setLayerVisibility(map, ['cities-points'], current.layers.has('cities'));
            setLayerVisibility(map, ['venues-points'], current.layers.has('venues'));
        }

        function syncRadiusOnly() {
            const current = propsRef.current;
            setSourceData(
                map,
                'radius',
                radiusFeatures({
                    cooks: current.cooks,
                    focus: current.focus,
                    coverageCooks: current.coverageCooks,
                    hoverCookId: hoverCookIdRef.current,
                }),
            );
        }

        map.on('load', () => {
            ensureClusteredPointLayers(map, 'cooks', COOK_COLOR_EXPR, 7);
            ensureClusteredPointLayers(map, 'bookings', '#2563eb', 6);
            ensureSimplePointLayers(map, 'cities', ['case', ['get', 'published'], '#7c3aed', '#a78bfa'] as ExpressionSpecification);
            ensureSimplePointLayers(map, 'venues', ['case', ['get', 'published'], '#0d9488', '#5eead4'] as ExpressionSpecification);
            ensureRadiusLayers(map);
            ensurePlaceLayers(map);
            syncData();
        });

        function focusFromFeature(properties: MapFeatureProperties): AdminMapFocus | null {
            if (!properties || typeof properties.layer !== 'string' || typeof properties.entityId !== 'string') return null;
            const layer = properties.layer;
            if (layer === 'place') {
                const latitude = Number(properties.latitude);
                const longitude = Number(properties.longitude);
                const label = typeof properties.label === 'string' ? properties.label : '';
                if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
                return { kind: 'place', latitude, longitude, label };
            }
            if (layer === 'cook') return { kind: 'cook', id: properties.entityId };
            if (layer === 'booking') return { kind: 'booking', id: properties.entityId };
            if (layer === 'city') return { kind: 'city', id: properties.entityId };
            if (layer === 'venue') return { kind: 'venue', id: properties.entityId };
            return null;
        }

        async function onClusterClick(sourceId: string, feature: MapGeoJSONFeature, lngLat: LngLat) {
            const clusterId = feature.properties?.cluster_id;
            if (typeof clusterId !== 'number') return;
            const source = map.getSource(sourceId) as GeoJSONSource | undefined;
            if (!source) return;
            const zoom = await source.getClusterExpansionZoom(clusterId);
            map.easeTo({ center: lngLat, zoom });
        }

        map.on('click', (event: MapMouseEvent) => {
            const clusterHits = map.queryRenderedFeatures(event.point, {
                layers: ['cooks-clusters', 'bookings-clusters'].filter((id) => map.getLayer(id)),
            });
            if (clusterHits[0]) {
                const layerId = clusterHits[0].layer.id;
                const sourceId = layerId.startsWith('bookings') ? 'bookings' : 'cooks';
                void onClusterClick(sourceId, clusterHits[0], event.lngLat);
                return;
            }

            const pointHits = map.queryRenderedFeatures(event.point, {
                layers: ['place-points', 'cooks-points', 'bookings-points', 'cities-points', 'venues-points'].filter((id) =>
                    map.getLayer(id),
                ),
            });
            const next = focusFromFeature((pointHits[0]?.properties as MapFeatureProperties) ?? null);
            propsRef.current.onFocusChange(next);
        });

        map.on('mouseenter', 'cooks-points', (event: MapLayerMouseEvent) => {
            map.getCanvas().style.cursor = 'pointer';
            const entityId = event.features?.[0]?.properties?.entityId;
            hoverCookIdRef.current = typeof entityId === 'string' ? entityId : null;
            syncRadiusOnly();
        });
        map.on('mouseleave', 'cooks-points', () => {
            map.getCanvas().style.cursor = '';
            hoverCookIdRef.current = null;
            syncRadiusOnly();
        });

        for (const layerId of [
            'place-points',
            'bookings-points',
            'cities-points',
            'venues-points',
            'cooks-clusters',
            'bookings-clusters',
        ]) {
            map.on('mouseenter', layerId, () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', layerId, () => {
                map.getCanvas().style.cursor = '';
            });
        }

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        setSourceData(map, 'cooks', layers.has('cooks') ? cookFeatures(cooks) : adminMapEmptyFeatureCollection());
        setSourceData(map, 'bookings', layers.has('bookings') ? bookingFeatures(bookingRequests) : adminMapEmptyFeatureCollection());
        setSourceData(map, 'cities', layers.has('cities') ? cityFeatures(cities) : adminMapEmptyFeatureCollection());
        setSourceData(map, 'venues', layers.has('venues') ? venueFeatures(partnerVenues) : adminMapEmptyFeatureCollection());
        setSourceData(
            map,
            'radius',
            radiusFeatures({
                cooks,
                focus,
                coverageCooks,
                hoverCookId: hoverCookIdRef.current,
            }),
        );
        setSourceData(map, 'place', placeFeatures(focus));
        setLayerVisibility(map, ['cooks-clusters', 'cooks-cluster-count', 'cooks-points'], layers.has('cooks'));
        setLayerVisibility(map, ['bookings-clusters', 'bookings-cluster-count', 'bookings-points'], layers.has('bookings'));
        setLayerVisibility(map, ['cities-points'], layers.has('cities'));
        setLayerVisibility(map, ['venues-points'], layers.has('venues'));
    }, [cooks, bookingRequests, cities, partnerVenues, layers, focus, coverageCooks]);

    useEffect(() => {
        const map = mapRef.current;
        if (!focus) {
            lastFlownKeyRef.current = null;
            return;
        }
        if (!map) return;

        let coordinates: [number, number] | null = null;
        if (focus.kind === 'place') {
            coordinates = [focus.longitude, focus.latitude];
        } else if (focus.kind === 'cook') {
            const cook = cooks.find((row) => row.cookId === focus.id);
            if (cook) coordinates = [cook.longitude, cook.latitude];
        } else if (focus.kind === 'booking') {
            const booking = bookingRequests.find((row) => row.bookingRequestId === focus.id);
            if (booking) coordinates = [booking.longitude, booking.latitude];
        } else if (focus.kind === 'city') {
            const city = cities.find((row) => row.cityId === focus.id);
            if (city) coordinates = [city.longitude, city.latitude];
        } else if (focus.kind === 'venue') {
            const venue = partnerVenues.find((row) => row.partnerVenueId === focus.id);
            if (venue) coordinates = [venue.longitude, venue.latitude];
        }

        if (!coordinates) return;
        const flownKey = `${focus.kind}:${coordinates[0]},${coordinates[1]}`;
        if (lastFlownKeyRef.current === flownKey) return;
        lastFlownKeyRef.current = flownKey;
        const zoomFloor = focus.kind === 'place' ? 11 : 9;
        map.easeTo({ center: coordinates, zoom: Math.max(map.getZoom(), zoomFloor) });
    }, [focus, cooks, bookingRequests, cities, partnerVenues]);

    return <div ref={containerRef} className="absolute inset-0 size-full" />;
}
