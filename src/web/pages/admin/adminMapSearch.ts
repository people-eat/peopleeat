import { parseISO, subDays } from 'date-fns';

import { formatIsoDate } from '../../../shared';
import { adminOverviewRangeToGraphQlVariables, parseAdminOverviewRangeSearch } from './adminOverviewRange';
import type { AdminOverviewDateRange, AdminOverviewRangeSearch } from './adminOverviewRange';

export const ADMIN_MAP_LAYERS = ['cooks', 'bookings', 'cities', 'venues'] as const;
export type AdminMapLayer = (typeof ADMIN_MAP_LAYERS)[number];

type AdminMapPinFocus = {
    kind: 'cook' | 'booking' | 'city' | 'venue';
    id: string;
};

export type AdminMapPlaceFocus = {
    kind: 'place';
    latitude: number;
    longitude: number;
    label: string;
};

export type AdminMapFocus = AdminMapPinFocus | AdminMapPlaceFocus;

export type AdminMapSearch = AdminOverviewRangeSearch & {
    layers?: string;
    focus?: string;
    placeLabel?: string;
};

export type AdminMapResolvedSearch = {
    range: AdminOverviewDateRange;
    layers: ReadonlySet<AdminMapLayer>;
    focus: AdminMapFocus | null;
};

function adminMapRangeDefault(now = new Date()): AdminOverviewDateRange {
    return {
        from: formatIsoDate(subDays(now, 89)),
        to: formatIsoDate(now),
    };
}

function parseLayers(value: unknown): ReadonlySet<AdminMapLayer> {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return new Set(ADMIN_MAP_LAYERS);
    }
    const parts = value
        .split(',')
        .map((part) => (part.trim() === 'partners' ? 'venues' : part.trim()))
        .filter((part): part is AdminMapLayer => (ADMIN_MAP_LAYERS as readonly string[]).includes(part));
    return parts.length > 0 ? new Set(parts) : new Set(ADMIN_MAP_LAYERS);
}

function parsePlaceLabel(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().replaceAll(/\s+/g, ' ').slice(0, 200);
}

function parsePlaceFocus(value: string, placeLabel: string): AdminMapPlaceFocus | null {
    const match = /^place:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(value.trim());
    if (!match) return null;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
    const label = placeLabel.length > 0 ? placeLabel : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    return { kind: 'place', latitude, longitude, label };
}

function parsePinFocus(value: string): AdminMapPinFocus | null {
    const match = /^(cook|booking|city|partner|venue):([A-Za-z0-9_-]{1,40})$/.exec(value.trim());
    if (!match) return null;
    const kind = (match[1] === 'partner' ? 'venue' : match[1]) as AdminMapPinFocus['kind'];
    return { kind, id: match[2]! };
}

function parseFocus(value: unknown, placeLabel: string): AdminMapFocus | null {
    if (typeof value !== 'string') return null;
    return parsePlaceFocus(value, placeLabel) ?? parsePinFocus(value);
}

function placeFocusForUrl(focus: AdminMapPlaceFocus): string {
    return `place:${focus.latitude.toFixed(6)},${focus.longitude.toFixed(6)}`;
}

function resolveMapRange(search: AdminOverviewRangeSearch, now = new Date()): AdminOverviewDateRange {
    const fallback = adminMapRangeDefault(now);
    if (!search.from || !search.to) return fallback;

    const fromDate = parseISO(search.from);
    const toDate = parseISO(search.to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate.getTime() > toDate.getTime()) {
        return fallback;
    }

    return { from: search.from, to: search.to };
}

export function parseAdminMapSearch(search: Record<string, unknown>): AdminMapSearch {
    const range = parseAdminOverviewRangeSearch(search);
    return {
        ...range,
        layers: typeof search.layers === 'string' ? search.layers : undefined,
        focus: typeof search.focus === 'string' ? search.focus : undefined,
        placeLabel: typeof search.placeLabel === 'string' ? search.placeLabel : undefined,
    };
}

export function adminMapSearchResolve(search: AdminMapSearch, now = new Date()): AdminMapResolvedSearch {
    return {
        range: resolveMapRange(search, now),
        layers: parseLayers(search.layers),
        focus: parseFocus(search.focus, parsePlaceLabel(search.placeLabel)),
    };
}

export function adminMapSearchForUrl(resolved: AdminMapResolvedSearch): AdminMapSearch {
    const allLayers = resolved.layers.size === ADMIN_MAP_LAYERS.length && ADMIN_MAP_LAYERS.every((layer) => resolved.layers.has(layer));
    const placeFocus = resolved.focus?.kind === 'place' ? resolved.focus : null;
    return {
        from: resolved.range.from,
        to: resolved.range.to,
        layers: allLayers ? undefined : [...ADMIN_MAP_LAYERS].filter((layer) => resolved.layers.has(layer)).join(','),
        focus: placeFocus
            ? placeFocusForUrl(placeFocus)
            : resolved.focus && resolved.focus.kind !== 'place'
              ? `${resolved.focus.kind}:${resolved.focus.id}`
              : undefined,
        ...(placeFocus?.label ? { placeLabel: placeFocus.label } : {}),
    };
}

export function adminMapPageVariables(search: AdminMapSearch = {}) {
    const resolved = adminMapSearchResolve(search);
    const { range } = adminOverviewRangeToGraphQlVariables(resolved.range);
    return {
        range,
        includeBookings: resolved.layers.has('bookings'),
    };
}
