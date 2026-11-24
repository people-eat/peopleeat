import { differenceInCalendarDays, parseISO, subDays } from 'date-fns';

import { formatIsoDate } from '../../../shared';
import { WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX, webPageKeyHasVisitEntity, webPageKeyIsTracked } from '../../../shared/webPage';
import type { WebPageKey, WebPageKeyWithVisitEntity } from '../../../shared/webPage';
import type {
    GqlCAdminTimeBucketGranularity,
    GqlCAdminWebPageVisitAudience,
    GqlCAdminWebPageVisitMetric,
    GqlCAdminWebPageVisitScope,
    GqlCWebPageKey,
} from '../../graphql/generated';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables, parseAdminOverviewRangeSearch } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';

const GRANULARITY_VALUES = ['day', 'week', 'month'] as const satisfies readonly GqlCAdminTimeBucketGranularity[];
const AUDIENCES = ['HUMAN', 'ALL'] as const satisfies readonly GqlCAdminWebPageVisitAudience[];
const METRICS = ['PAGEVIEWS', 'UNIQUE_SESSIONS'] as const satisfies readonly GqlCAdminWebPageVisitMetric[];
const SCOPES = ['ALL', 'INDEX', 'DETAIL'] as const satisfies readonly GqlCAdminWebPageVisitScope[];

function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
    return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function parseKeys(value: unknown): WebPageKey[] {
    const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
    const keys: WebPageKey[] = [];
    for (const item of raw) {
        if (typeof item !== 'string') continue;
        const key = item.trim();
        if (!webPageKeyIsTracked(key as WebPageKey)) continue;
        if (!keys.includes(key as WebPageKey)) keys.push(key as WebPageKey);
        if (keys.length >= WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX) break;
    }
    return keys;
}

function parseIdList(value: unknown): string[] {
    const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
    const ids: string[] = [];
    for (const item of raw) {
        if (typeof item !== 'string') continue;
        const id = item.trim();
        if (!id || ids.includes(id)) continue;
        ids.push(id);
        if (ids.length >= WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX) break;
    }
    return ids;
}

function parseOptionalIdList(value: unknown): string | undefined {
    const ids = parseIdList(value);
    return ids.length > 0 ? ids.join(',') : undefined;
}

export type AdminTrafficSearch = AdminOverviewRangeSearch & {
    granularity?: GqlCAdminTimeBucketGranularity;
    keys?: string;
    audience?: GqlCAdminWebPageVisitAudience;
    metric?: GqlCAdminWebPageVisitMetric;
    scope?: GqlCAdminWebPageVisitScope;
    cookId?: string;
    cityId?: string;
    partnerVenueId?: string;
    occasionId?: string;
    blogPostId?: string;
    previous?: string;
};

export type AdminTrafficResolved = {
    from: string;
    to: string;
    granularity: GqlCAdminTimeBucketGranularity;
    keys: WebPageKey[];
    audience: GqlCAdminWebPageVisitAudience;
    metric: GqlCAdminWebPageVisitMetric;
    scope: GqlCAdminWebPageVisitScope;
    cookIds: string[];
    cityIds: string[];
    partnerVenueIds: string[];
    occasionIds: string[];
    blogPostIds: string[];
    focusedKey: WebPageKeyWithVisitEntity | null;
    compareIds: string[];
    previous: boolean;
};

export function parseAdminTrafficSearch(search: Record<string, unknown>): AdminTrafficSearch {
    return {
        ...parseAdminOverviewRangeSearch(search),
        granularity: parseEnum(search.granularity, GRANULARITY_VALUES),
        keys: parseKeys(search.keys).join(',') || undefined,
        audience: parseEnum(search.audience, AUDIENCES),
        metric: parseEnum(search.metric, METRICS),
        scope: parseEnum(search.scope, SCOPES),
        cookId: parseOptionalIdList(search.cookId),
        cityId: parseOptionalIdList(search.cityId),
        partnerVenueId: parseOptionalIdList(search.partnerVenueId),
        occasionId: parseOptionalIdList(search.occasionId),
        blogPostId: parseOptionalIdList(search.blogPostId),
        previous: previousIsOff(search.previous) ? '0' : undefined,
    };
}

function previousIsOff(value: unknown): boolean {
    return value === false || value === '0' || value === 'false';
}

export function adminTrafficSearchResolve(search: AdminTrafficSearch): AdminTrafficResolved {
    const range = adminOverviewRangeResolve(search);
    const keys = parseKeys(search.keys);
    const focusedKey = keys.length === 1 && webPageKeyHasVisitEntity(keys[0]!) ? keys[0]! : null;
    const cookIds = focusedKey === 'CHEFS' ? parseIdList(search.cookId) : [];
    const cityIds = focusedKey === 'CITIES' ? parseIdList(search.cityId) : [];
    const partnerVenueIds = focusedKey === 'VENUES' ? parseIdList(search.partnerVenueId) : [];
    const occasionIds = focusedKey === 'OCCASIONS' ? parseIdList(search.occasionId) : [];
    const blogPostIds = focusedKey === 'BLOG_POSTS' ? parseIdList(search.blogPostId) : [];
    const compareIds =
        focusedKey === 'CHEFS'
            ? cookIds
            : focusedKey === 'CITIES'
              ? cityIds
              : focusedKey === 'VENUES'
                ? partnerVenueIds
                : focusedKey === 'OCCASIONS'
                  ? occasionIds
                  : focusedKey === 'BLOG_POSTS'
                    ? blogPostIds
                    : [];
    return {
        from: range.from,
        to: range.to,
        granularity: search.granularity ?? 'day',
        keys,
        audience: search.audience ?? 'HUMAN',
        metric: search.metric ?? 'PAGEVIEWS',
        scope: focusedKey && compareIds.length === 0 ? (search.scope ?? 'ALL') : 'ALL',
        cookIds,
        cityIds,
        partnerVenueIds,
        occasionIds,
        blogPostIds,
        focusedKey,
        compareIds,
        previous: !previousIsOff(search.previous),
    };
}

export function adminTrafficSearchToUrl(resolved: AdminTrafficResolved): AdminTrafficSearch {
    const range = adminOverviewRangeResolve({ from: resolved.from, to: resolved.to });
    const defaults = adminOverviewRangeResolve({});
    // Emit both bounds whenever either differs. Resolve requires from+to together; a
    // lone custom `to` (default `from` omitted) would be ignored and fall back to defaults.
    const rangeIsDefault = range.from === defaults.from && range.to === defaults.to;
    return {
        from: rangeIsDefault ? undefined : range.from,
        to: rangeIsDefault ? undefined : range.to,
        granularity: resolved.granularity === 'day' ? undefined : resolved.granularity,
        keys: resolved.keys.length > 0 ? resolved.keys.join(',') : undefined,
        audience: resolved.audience === 'HUMAN' ? undefined : resolved.audience,
        metric: resolved.metric === 'PAGEVIEWS' ? undefined : resolved.metric,
        scope: !resolved.focusedKey || resolved.compareIds.length > 0 || resolved.scope === 'ALL' ? undefined : resolved.scope,
        cookId: resolved.focusedKey === 'CHEFS' && resolved.cookIds.length > 0 ? resolved.cookIds.join(',') : undefined,
        cityId: resolved.focusedKey === 'CITIES' && resolved.cityIds.length > 0 ? resolved.cityIds.join(',') : undefined,
        partnerVenueId:
            resolved.focusedKey === 'VENUES' && resolved.partnerVenueIds.length > 0 ? resolved.partnerVenueIds.join(',') : undefined,
        occasionId: resolved.focusedKey === 'OCCASIONS' && resolved.occasionIds.length > 0 ? resolved.occasionIds.join(',') : undefined,
        blogPostId: resolved.focusedKey === 'BLOG_POSTS' && resolved.blogPostIds.length > 0 ? resolved.blogPostIds.join(',') : undefined,
        previous: resolved.previous ? undefined : '0',
    };
}

function adminTrafficCompareIdsForKey(resolved: AdminTrafficResolved, key: WebPageKeyWithVisitEntity): string[] {
    if (key === 'CHEFS') return resolved.cookIds;
    if (key === 'CITIES') return resolved.cityIds;
    if (key === 'VENUES') return resolved.partnerVenueIds;
    if (key === 'OCCASIONS') return resolved.occasionIds;
    return resolved.blogPostIds;
}

export function adminTrafficToggleCompareId(resolved: AdminTrafficResolved, id: string): Partial<AdminTrafficResolved> {
    if (!resolved.focusedKey) return {};
    const current = adminTrafficCompareIdsForKey(resolved, resolved.focusedKey);
    const selected = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id].slice(0, WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX);
    const turningSecondSeries = !current.includes(id) && current.length === 1 && selected.length === 2;
    return {
        ...adminTrafficCompareIdsPatch(resolved.focusedKey, selected),
        ...(turningSecondSeries ? { previous: false } : {}),
    };
}

export function adminTrafficPreviousRange(from: string, to: string): { from: string; to: string } {
    const start = parseISO(from);
    const end = parseISO(to);
    const spanDays = differenceInCalendarDays(end, start);
    const previousTo = subDays(start, 1);
    return {
        from: formatIsoDate(subDays(previousTo, spanDays)),
        to: formatIsoDate(previousTo),
    };
}

function adminTrafficCompareIdsPatch(key: WebPageKeyWithVisitEntity, ids: string[]): Partial<AdminTrafficResolved> {
    return {
        cookIds: key === 'CHEFS' ? ids : [],
        cityIds: key === 'CITIES' ? ids : [],
        partnerVenueIds: key === 'VENUES' ? ids : [],
        occasionIds: key === 'OCCASIONS' ? ids : [],
        blogPostIds: key === 'BLOG_POSTS' ? ids : [],
        scope: 'ALL',
    };
}

export function adminTrafficClearCompare(): Partial<AdminTrafficResolved> {
    return {
        cookIds: [],
        cityIds: [],
        partnerVenueIds: [],
        occasionIds: [],
        blogPostIds: [],
        scope: 'ALL',
    };
}

export function adminTrafficRangeLastDays(days: 7 | 30 | 90, now = new Date()): { from: string; to: string } {
    return {
        from: formatIsoDate(subDays(now, days - 1)),
        to: formatIsoDate(now),
    };
}

export function adminTrafficPageVariables(search: AdminTrafficSearch = {}) {
    const resolved = adminTrafficSearchResolve(search);
    const rangeVariables = adminOverviewRangeToGraphQlVariables({ from: resolved.from, to: resolved.to });
    const entity =
        resolved.focusedKey && resolved.compareIds.length > 0
            ? {
                  cookIds: resolved.cookIds,
                  cityIds: resolved.cityIds,
                  partnerVenueIds: resolved.partnerVenueIds,
                  occasionIds: resolved.occasionIds,
                  blogPostIds: resolved.blogPostIds,
              }
            : null;
    return {
        range: rangeVariables.range,
        granularity: resolved.granularity,
        webPageKeys: resolved.keys as GqlCWebPageKey[],
        audience: resolved.audience,
        metric: resolved.metric,
        scope: resolved.scope,
        entity,
    };
}
