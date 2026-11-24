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

function parseOptionalId(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
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
};

export type AdminTrafficResolved = {
    from: string;
    to: string;
    granularity: GqlCAdminTimeBucketGranularity;
    keys: WebPageKey[];
    audience: GqlCAdminWebPageVisitAudience;
    metric: GqlCAdminWebPageVisitMetric;
    scope: GqlCAdminWebPageVisitScope;
    cookId?: string;
    cityId?: string;
    partnerVenueId?: string;
    occasionId?: string;
    blogPostId?: string;
    focusedKey: WebPageKeyWithVisitEntity | null;
};

export function parseAdminTrafficSearch(search: Record<string, unknown>): AdminTrafficSearch {
    return {
        ...parseAdminOverviewRangeSearch(search),
        granularity: parseEnum(search.granularity, GRANULARITY_VALUES),
        keys: parseKeys(search.keys).join(',') || undefined,
        audience: parseEnum(search.audience, AUDIENCES),
        metric: parseEnum(search.metric, METRICS),
        scope: parseEnum(search.scope, SCOPES),
        cookId: parseOptionalId(search.cookId),
        cityId: parseOptionalId(search.cityId),
        partnerVenueId: parseOptionalId(search.partnerVenueId),
        occasionId: parseOptionalId(search.occasionId),
        blogPostId: parseOptionalId(search.blogPostId),
    };
}

export function adminTrafficSearchResolve(search: AdminTrafficSearch): AdminTrafficResolved {
    const range = adminOverviewRangeResolve(search);
    const keys = parseKeys(search.keys);
    const focusedKey = keys.length === 1 && webPageKeyHasVisitEntity(keys[0]!) ? keys[0]! : null;
    return {
        from: range.from,
        to: range.to,
        granularity: search.granularity ?? 'day',
        keys,
        audience: search.audience ?? 'HUMAN',
        metric: search.metric ?? 'PAGEVIEWS',
        scope: focusedKey ? (search.scope ?? 'ALL') : 'ALL',
        cookId: focusedKey === 'CHEFS' ? search.cookId : undefined,
        cityId: focusedKey === 'CITIES' ? search.cityId : undefined,
        partnerVenueId: focusedKey === 'VENUES' ? search.partnerVenueId : undefined,
        occasionId: focusedKey === 'OCCASIONS' ? search.occasionId : undefined,
        blogPostId: focusedKey === 'BLOG_POSTS' ? search.blogPostId : undefined,
        focusedKey,
    };
}

export function adminTrafficSearchToUrl(resolved: AdminTrafficResolved): AdminTrafficSearch {
    const range = adminOverviewRangeResolve({ from: resolved.from, to: resolved.to });
    const defaults = adminOverviewRangeResolve({});
    return {
        from: range.from === defaults.from ? undefined : range.from,
        to: range.to === defaults.to ? undefined : range.to,
        granularity: resolved.granularity === 'day' ? undefined : resolved.granularity,
        keys: resolved.keys.length > 0 ? resolved.keys.join(',') : undefined,
        audience: resolved.audience === 'HUMAN' ? undefined : resolved.audience,
        metric: resolved.metric === 'PAGEVIEWS' ? undefined : resolved.metric,
        scope: !resolved.focusedKey || resolved.scope === 'ALL' ? undefined : resolved.scope,
        cookId: resolved.cookId,
        cityId: resolved.cityId,
        partnerVenueId: resolved.partnerVenueId,
        occasionId: resolved.occasionId,
        blogPostId: resolved.blogPostId,
    };
}

export function adminTrafficPageVariables(search: AdminTrafficSearch = {}) {
    const resolved = adminTrafficSearchResolve(search);
    const rangeVariables = adminOverviewRangeToGraphQlVariables({ from: resolved.from, to: resolved.to });
    const entity = resolved.focusedKey
        ? {
              cookId: resolved.cookId ?? null,
              cityId: resolved.cityId ?? null,
              partnerVenueId: resolved.partnerVenueId ?? null,
              occasionId: resolved.occasionId ?? null,
              blogPostId: resolved.blogPostId ?? null,
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
