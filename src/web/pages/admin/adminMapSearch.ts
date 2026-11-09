import { parseISO, subDays } from 'date-fns';

import { formatIsoDate } from '../../../shared';
import { adminOverviewRangeToGraphQlVariables, parseAdminOverviewRangeSearch } from './adminOverviewRange';
import type { AdminOverviewDateRange, AdminOverviewRangeSearch } from './adminOverviewRange';

export const ADMIN_MAP_LAYERS = ['cooks', 'bookings', 'cities', 'venues'] as const;
export type AdminMapLayer = (typeof ADMIN_MAP_LAYERS)[number];

type AdminMapFocusKind = 'cook' | 'booking' | 'city' | 'venue';

export type AdminMapFocus = {
    kind: AdminMapFocusKind;
    id: string;
};

export type AdminMapSearch = AdminOverviewRangeSearch & {
    layers?: string;
    focus?: string;
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

function parseFocus(value: unknown): AdminMapFocus | null {
    if (typeof value !== 'string') return null;
    const match = /^(cook|booking|city|partner|venue):([A-Za-z0-9_-]{1,40})$/.exec(value.trim());
    if (!match) return null;
    const kind = (match[1] === 'partner' ? 'venue' : match[1]) as AdminMapFocusKind;
    return { kind, id: match[2]! };
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
    };
}

export function adminMapSearchResolve(search: AdminMapSearch, now = new Date()): AdminMapResolvedSearch {
    return {
        range: resolveMapRange(search, now),
        layers: parseLayers(search.layers),
        focus: parseFocus(search.focus),
    };
}

export function adminMapSearchForUrl(resolved: AdminMapResolvedSearch): AdminMapSearch {
    const allLayers = resolved.layers.size === ADMIN_MAP_LAYERS.length && ADMIN_MAP_LAYERS.every((layer) => resolved.layers.has(layer));
    return {
        from: resolved.range.from,
        to: resolved.range.to,
        layers: allLayers ? undefined : [...ADMIN_MAP_LAYERS].filter((layer) => resolved.layers.has(layer)).join(','),
        focus: resolved.focus ? `${resolved.focus.kind}:${resolved.focus.id}` : undefined,
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
