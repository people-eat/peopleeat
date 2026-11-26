import { eq, inArray, sql } from 'drizzle-orm';

import { t } from '../../i18n/t';
import { contentLocaleText } from '../../shared/contentSection';
import { DEFAULT_LOCALE } from '../../shared/locale';
import type { Locale } from '../../shared/locale';
import {
    WEB_PAGE_VISIT_ENTITY_RANK_MAX,
    WEB_PAGE_VISIT_INDEX_RANK_ID,
    WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX,
    webPageKeyHasVisitEntity,
    webPageKeyParse,
    webPageKeyRanksFullCatalog,
    webPageVisitDetailPathPatternByKey,
    webPageVisitEntityParamByKey,
} from '../../shared/webPage';
import type { WebPageKey, WebPageKeyWithVisitEntity } from '../../shared/webPage';
import { blogPosts, cities, cooks, occasions, partnerVenues, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminTimeBucket,
    GqlSAdminTimeBucketGranularity,
    GqlSAdminWebPageVisitAudience,
    GqlSAdminWebPageVisitEntity,
    GqlSAdminWebPageVisitEntityRank,
    GqlSAdminWebPageVisitMetric,
    GqlSAdminWebPageVisitRank,
    GqlSAdminWebPageVisitScope,
    GqlSAdminWebPageVisitSeries,
    GqlSAdminWebPageVisitTraffic,
    GqlSDateTimeRange,
    GqlSSession,
    GqlSWebPageKey,
} from '../graphql/generated';
import { adminWebPageVisitAudienceSql } from '../utils/adminWebPageVisitAudienceSql';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';
import { userLocaleRequire } from '../utils/userLocaleRequire';

type BucketCountRow = {
    bucket_start: Date;
    series_key: string | null;
    pageviews: string | number;
    unique_sessions: string | number;
};

type RankRow = {
    web_page_key: string;
    pageviews: string | number;
    unique_sessions: string | number;
};

type EntityRankRow = {
    entity_id: string;
    pageviews: string | number;
    unique_sessions: string | number;
};

type WindowParts = {
    startDateTime: Date;
    endDateTime: Date;
    truncLiteral: ReturnType<typeof sql.raw>;
    step: ReturnType<typeof sql>;
};

function asInt(value: string | number | null | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    return 0;
}

function asDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
}

function truncParts(granularity: GqlSAdminTimeBucketGranularity): {
    truncLiteral: ReturnType<typeof sql.raw>;
    step: ReturnType<typeof sql>;
} {
    const truncUnit = granularity === 'week' ? 'week' : granularity === 'month' ? 'month' : 'day';
    return {
        truncLiteral: sql.raw(`'${truncUnit}'`),
        step: truncUnit === 'week' ? sql`interval '1 week'` : truncUnit === 'month' ? sql`interval '1 month'` : sql`interval '1 day'`,
    };
}

function previousWindow(startDateTime: Date, endDateTime: Date): { startDateTime: Date; endDateTime: Date } {
    const durationMs = endDateTime.getTime() - startDateTime.getTime();
    const previousEndDateTime = new Date(startDateTime.getTime() - 1);
    return {
        startDateTime: new Date(previousEndDateTime.getTime() - durationMs),
        endDateTime: previousEndDateTime,
    };
}

export function entityParamExpr(key: WebPageKeyWithVisitEntity): ReturnType<typeof sql.raw> {
    return sql.raw(`e.payload->'params'->>'${webPageVisitEntityParamByKey[key]}'`);
}

function webPageKeySql() {
    return sql`e.payload->>'webPageKey'`;
}

export function storedWebPageKeyMatchSql(key: WebPageKey) {
    return sql`e.payload->>'webPageKey' = ${key}`;
}

async function catalogIdsForRank(key: WebPageKeyWithVisitEntity, serverRuntime: ServerRuntime): Promise<string[]> {
    if (!webPageKeyRanksFullCatalog(key)) return [];
    if (key === 'CITIES') {
        const rows = await serverRuntime.db.select({ id: cities.cityId }).from(cities);
        return rows.map((row) => row.id);
    }
    if (key === 'VENUES') {
        const rows = await serverRuntime.db.select({ id: partnerVenues.partnerVenueId }).from(partnerVenues);
        return rows.map((row) => row.id);
    }
    if (key === 'OCCASIONS') {
        const rows = await serverRuntime.db.select({ id: occasions.occasionId }).from(occasions);
        return rows.map((row) => row.id);
    }
    const rows = await serverRuntime.db.select({ id: blogPosts.blogPostId }).from(blogPosts);
    return rows.map((row) => row.id);
}

function entityIdsFromInput(key: WebPageKeyWithVisitEntity, entity: GqlSAdminWebPageVisitEntity | null | undefined): string[] {
    if (!entity) return [];
    const raw =
        key === 'CHEFS'
            ? entity.cookIds
            : key === 'CITIES'
              ? entity.cityIds
              : key === 'VENUES'
                ? entity.partnerVenueIds
                : key === 'OCCASIONS'
                  ? entity.occasionIds
                  : entity.blogPostIds;
    const ids: string[] = [];
    for (const value of raw ?? []) {
        if (typeof value !== 'string') continue;
        const id = value.trim();
        if (!id || ids.includes(id)) continue;
        ids.push(id);
        if (ids.length >= WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX) break;
    }
    return ids;
}

function visitWhereSql(args: {
    audienceJoin: ReturnType<typeof sql>;
    audienceWhere: ReturnType<typeof sql>;
    startDateTime: Date;
    endDateTime: Date;
    truncLiteral: ReturnType<typeof sql.raw>;
    step: ReturnType<typeof sql>;
    keys: GqlSWebPageKey[];
    scope: GqlSAdminWebPageVisitScope;
    focusedKey: WebPageKeyWithVisitEntity | null;
    compareIds: string[];
}): ReturnType<typeof sql> {
    const keyFilter =
        args.keys.length === 0
            ? sql`true`
            : sql`e.payload->>'webPageKey' IN (${sql.join(
                  args.keys.map((key) => sql`${key}`),
                  sql`, `,
              )})`;

    let entityFilter = sql`true`;
    if (args.focusedKey && args.compareIds.length === 0) {
        const param = entityParamExpr(args.focusedKey);
        if (args.scope === 'INDEX') {
            entityFilter = sql`${param} IS NULL`;
        } else if (args.scope === 'DETAIL') {
            entityFilter = sql`${param} IS NOT NULL`;
        }
    }

    return sql`
        FROM "SessionEvents" e
        ${args.audienceJoin}
        WHERE e.type = 'WEB_PAGE_VISITED'
          AND ${args.audienceWhere}
          AND ${keyFilter}
          AND ${entityFilter}
          AND e."createdAt" >= date_trunc(${args.truncLiteral}, ${args.startDateTime}::timestamptz)
          AND e."createdAt" < date_trunc(${args.truncLiteral}, ${args.endDateTime}::timestamptz) + ${args.step}
    `;
}

function bucketCount(row: BucketCountRow, metric: GqlSAdminWebPageVisitMetric): number {
    return metric === 'UNIQUE_SESSIONS' ? asInt(row.unique_sessions) : asInt(row.pageviews);
}

function indexVisitSql(focusedKey: WebPageKeyWithVisitEntity): ReturnType<typeof sql> {
    const param = entityParamExpr(focusedKey);
    return sql`${param} IS NULL AND (e.payload->>'path' IS NULL OR e.payload->>'path' !~ ${webPageVisitDetailPathPatternByKey[focusedKey]})`;
}

function executeRows<T>(result: T[] | { rows: T[] }): T[] {
    return Array.isArray(result) ? result : result.rows;
}

function seriesLabelForPageKey(key: GqlSWebPageKey | null, locale: Locale): string {
    if (!key) return t(locale, 'admin', 'traffic.allPages');
    return t(locale, 'admin', `webPages.labels.${key}`);
}

function emptyPrevious(): { previousPageviews: number; previousUniqueSessions: number } {
    return { previousPageviews: 0, previousUniqueSessions: 0 };
}

function alignPreviousBuckets(current: GqlSAdminTimeBucket[], previous: GqlSAdminTimeBucket[]): GqlSAdminTimeBucket[] {
    return current.map((bucket, index) => ({
        bucketStart: bucket.bucketStart,
        count: previous[index]?.count ?? 0,
    }));
}

async function entityRanksLabel(
    rows: EntityRankRow[],
    key: WebPageKeyWithVisitEntity,
    locale: Locale,
    serverRuntime: ServerRuntime,
    previousById: Map<string, { previousPageviews: number; previousUniqueSessions: number }>,
): Promise<GqlSAdminWebPageVisitEntityRank[]> {
    const ids = rows.map((row) => row.entity_id);
    const labels = new Map<string, { label: string; pathName: string | null }>();

    if (ids.length === 0) return [];

    if (key === 'CHEFS') {
        const cookRows = await serverRuntime.db
            .select({
                cookId: cooks.cookId,
                pathName: cooks.pathName,
                firstName: users.firstName,
                lastName: users.lastName,
            })
            .from(cooks)
            .innerJoin(users, eq(users.userId, cooks.cookId))
            .where(inArray(cooks.cookId, ids));
        for (const cook of cookRows) {
            labels.set(cook.cookId, {
                label: `${cook.firstName} ${cook.lastName}`.trim() || cook.pathName,
                pathName: cook.pathName,
            });
        }
    } else if (key === 'CITIES') {
        const cityRows = await serverRuntime.db
            .select({ cityId: cities.cityId, pathName: cities.pathName, nameDe: cities.nameDe, nameEn: cities.nameEn })
            .from(cities)
            .where(inArray(cities.cityId, ids));
        for (const city of cityRows) {
            labels.set(city.cityId, {
                label: contentLocaleText(city.nameDe, city.nameEn, locale),
                pathName: city.pathName,
            });
        }
    } else if (key === 'VENUES') {
        const venueRows = await serverRuntime.db
            .select({
                partnerVenueId: partnerVenues.partnerVenueId,
                pathName: partnerVenues.pathName,
                name: partnerVenues.name,
            })
            .from(partnerVenues)
            .where(inArray(partnerVenues.partnerVenueId, ids));
        for (const venue of venueRows) {
            labels.set(venue.partnerVenueId, { label: venue.name, pathName: venue.pathName });
        }
    } else if (key === 'OCCASIONS') {
        const occasionRows = await serverRuntime.db
            .select({ occasionId: occasions.occasionId, pathName: occasions.pathName, name: occasions.name })
            .from(occasions)
            .where(inArray(occasions.occasionId, ids));
        for (const occasion of occasionRows) {
            labels.set(occasion.occasionId, { label: occasion.name, pathName: occasion.pathName });
        }
    } else {
        const postRows = await serverRuntime.db
            .select({
                blogPostId: blogPosts.blogPostId,
                pathName: blogPosts.pathName,
                titleDe: blogPosts.titleDe,
                titleEn: blogPosts.titleEn,
            })
            .from(blogPosts)
            .where(inArray(blogPosts.blogPostId, ids));
        for (const post of postRows) {
            labels.set(post.blogPostId, {
                label: contentLocaleText(post.titleDe, post.titleEn, locale),
                pathName: post.pathName,
            });
        }
    }

    return rows.map((row) => {
        const named = labels.get(row.entity_id);
        const previous = previousById.get(row.entity_id) ?? emptyPrevious();
        return {
            id: row.entity_id,
            label: named?.label || row.entity_id,
            pathName: named?.pathName ?? null,
            pageviews: asInt(row.pageviews),
            uniqueSessions: asInt(row.unique_sessions),
            previousPageviews: previous.previousPageviews,
            previousUniqueSessions: previous.previousUniqueSessions,
        };
    });
}

async function fetchBucketSeries(
    serverRuntime: ServerRuntime,
    window: WindowParts,
    seriesJoin: ReturnType<typeof sql>,
    seriesSelectKey: ReturnType<typeof sql>,
    countsGroupKey: ReturnType<typeof sql>,
    countsJoinKey: ReturnType<typeof sql>,
    fromWhere: ReturnType<typeof sql>,
    metric: GqlSAdminWebPageVisitMetric,
): Promise<Map<string | null, GqlSAdminTimeBucket[]>> {
    const result = await serverRuntime.db.execute<BucketCountRow>(sql`
        SELECT
            series.bucket_start AS bucket_start,
            ${seriesSelectKey} AS series_key,
            COALESCE(counts.pageviews, 0)::int AS pageviews,
            COALESCE(counts.unique_sessions, 0)::int AS unique_sessions
        FROM generate_series(
            date_trunc(${window.truncLiteral}, ${window.startDateTime}::timestamptz),
            date_trunc(${window.truncLiteral}, ${window.endDateTime}::timestamptz),
            ${window.step}
        ) AS series(bucket_start)
        ${seriesJoin}
        LEFT JOIN (
            SELECT
                date_trunc(${window.truncLiteral}, e."createdAt") AS bucket_start,
                ${countsGroupKey} AS series_key,
                COUNT(*)::int AS pageviews,
                COUNT(DISTINCT e."sessionId")::int AS unique_sessions
            ${fromWhere}
            GROUP BY 1, 2
        ) AS counts
            ON counts.bucket_start = series.bucket_start
           AND ${countsJoinKey}
        ORDER BY series.bucket_start ASC, series_key ASC NULLS FIRST
    `);
    const seriesByKey = new Map<string | null, GqlSAdminTimeBucket[]>();
    for (const row of executeRows(result)) {
        const key = row.series_key;
        const buckets = seriesByKey.get(key) ?? [];
        buckets.push({
            bucketStart: asDate(row.bucket_start),
            count: bucketCount(row, metric),
        });
        seriesByKey.set(key, buckets);
    }
    return seriesByKey;
}

async function fetchTotalsByKey(
    serverRuntime: ServerRuntime,
    countsGroupKey: ReturnType<typeof sql>,
    fromWhere: ReturnType<typeof sql>,
): Promise<Map<string | null, { pageviews: number; uniqueSessions: number }>> {
    const result = await serverRuntime.db.execute<BucketCountRow>(sql`
        SELECT
            ${countsGroupKey} AS series_key,
            COUNT(*)::int AS pageviews,
            COUNT(DISTINCT e."sessionId")::int AS unique_sessions,
            NULL::timestamptz AS bucket_start
        ${fromWhere}
        GROUP BY 1
    `);
    const totalsByKey = new Map<string | null, { pageviews: number; uniqueSessions: number }>();
    for (const row of executeRows(result)) {
        totalsByKey.set(row.series_key, {
            pageviews: asInt(row.pageviews),
            uniqueSessions: asInt(row.unique_sessions),
        });
    }
    return totalsByKey;
}

async function fetchOverall(
    serverRuntime: ServerRuntime,
    fromWhere: ReturnType<typeof sql>,
): Promise<{ pageviews: number; uniqueSessions: number }> {
    const result = await serverRuntime.db.execute<{ pageviews: string | number; unique_sessions: string | number }>(sql`
        SELECT
            COUNT(*)::int AS pageviews,
            COUNT(DISTINCT e."sessionId")::int AS unique_sessions
        ${fromWhere}
    `);
    const row = executeRows(result)[0];
    return { pageviews: asInt(row?.pageviews), uniqueSessions: asInt(row?.unique_sessions) };
}

export async function adminWebPageVisitTrafficFindOne(
    args: {
        range: GqlSDateTimeRange;
        granularity?: GqlSAdminTimeBucketGranularity | null;
        webPageKeys?: GqlSWebPageKey[] | null;
        audience: GqlSAdminWebPageVisitAudience;
        metric: GqlSAdminWebPageVisitMetric;
        scope: GqlSAdminWebPageVisitScope;
        entity?: GqlSAdminWebPageVisitEntity | null;
    },
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminWebPageVisitTraffic> {
    try {
        const locale = requestingSession.userId ? await userLocaleRequire(serverRuntime, requestingSession.userId) : DEFAULT_LOCALE;
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
        const granularity = args.granularity ?? 'day';
        const { truncLiteral, step } = truncParts(granularity);
        const keys = [...new Set((args.webPageKeys ?? []).filter((key): key is WebPageKey => Boolean(key)))].slice(
            0,
            WEB_PAGE_VISIT_TRAFFIC_SERIES_MAX,
        );
        const onlyKey = keys.length === 1 ? keys[0] : undefined;
        const focusedKey = onlyKey && webPageKeyHasVisitEntity(onlyKey) ? onlyKey : null;
        const compareIds = focusedKey ? entityIdsFromInput(focusedKey, args.entity) : [];
        const comparing = compareIds.length > 0;
        const audience = adminWebPageVisitAudienceSql(args.audience);
        const currentWindow: WindowParts = { startDateTime, endDateTime, truncLiteral, step };
        const previous = previousWindow(startDateTime, endDateTime);
        const previousParts: WindowParts = { ...previous, truncLiteral, step };

        const visitWhereArgs = {
            audienceJoin: audience.join,
            audienceWhere: audience.where,
            truncLiteral,
            step,
            keys,
            scope: comparing ? ('ALL' as const) : args.scope,
            focusedKey,
            compareIds: [] as string[],
        };
        const fromWhere = visitWhereSql({ ...visitWhereArgs, startDateTime, endDateTime });
        const previousFromWhere = visitWhereSql({
            ...visitWhereArgs,
            startDateTime: previous.startDateTime,
            endDateTime: previous.endDateTime,
        });

        const rankOrderSql =
            args.metric === 'UNIQUE_SESSIONS' ? sql`unique_sessions DESC, web_page_key ASC` : sql`pageviews DESC, web_page_key ASC`;
        const entityRankOrderSql =
            args.metric === 'UNIQUE_SESSIONS' ? sql`unique_sessions DESC, entity_id ASC` : sql`pageviews DESC, entity_id ASC`;

        const rankResult = await serverRuntime.db.execute<RankRow>(sql`
            SELECT
                ${webPageKeySql()} AS web_page_key,
                COUNT(*)::int AS pageviews,
                COUNT(DISTINCT e."sessionId")::int AS unique_sessions
            FROM "SessionEvents" e
            ${audience.join}
            WHERE e.type = 'WEB_PAGE_VISITED'
              AND ${audience.where}
              AND e."createdAt" >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
              AND e."createdAt" < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
            GROUP BY 1
            ORDER BY ${rankOrderSql}
        `);
        const previousRankResult = await serverRuntime.db.execute<RankRow>(sql`
            SELECT
                ${webPageKeySql()} AS web_page_key,
                COUNT(*)::int AS pageviews,
                COUNT(DISTINCT e."sessionId")::int AS unique_sessions
            FROM "SessionEvents" e
            ${audience.join}
            WHERE e.type = 'WEB_PAGE_VISITED'
              AND ${audience.where}
              AND e."createdAt" >= date_trunc(${truncLiteral}, ${previous.startDateTime}::timestamptz)
              AND e."createdAt" < date_trunc(${truncLiteral}, ${previous.endDateTime}::timestamptz) + ${step}
            GROUP BY 1
        `);
        const previousRankByKey = new Map<string, { previousPageviews: number; previousUniqueSessions: number }>();
        for (const row of executeRows(previousRankResult)) {
            previousRankByKey.set(row.web_page_key, {
                previousPageviews: asInt(row.pageviews),
                previousUniqueSessions: asInt(row.unique_sessions),
            });
        }

        let entityRankRows: EntityRankRow[] = [];
        let previousEntityById = new Map<string, { previousPageviews: number; previousUniqueSessions: number }>();
        let entityVisitCount = 0;
        let untaggedDetailVisitCount = 0;
        let indexRank: GqlSAdminWebPageVisitEntityRank | null = null;
        if (focusedKey) {
            const param = entityParamExpr(focusedKey);
            const catalogIds = await catalogIdsForRank(focusedKey, serverRuntime);
            const rankLimitSql = catalogIds.length > 0 ? sql`` : sql`LIMIT ${WEB_PAGE_VISIT_ENTITY_RANK_MAX}`;
            const entityResult = await serverRuntime.db.execute<EntityRankRow>(sql`
                SELECT
                    ${param} AS entity_id,
                    COUNT(*)::int AS pageviews,
                    COUNT(DISTINCT e."sessionId")::int AS unique_sessions
                FROM "SessionEvents" e
                ${audience.join}
                WHERE e.type = 'WEB_PAGE_VISITED'
                  AND ${audience.where}
                  AND ${storedWebPageKeyMatchSql(focusedKey)}
                  AND ${param} IS NOT NULL
                  AND e."createdAt" >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
                  AND e."createdAt" < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
                GROUP BY 1
                ORDER BY ${entityRankOrderSql}
                ${rankLimitSql}
            `);
            entityRankRows = executeRows(entityResult).filter((row) => Boolean(row.entity_id));

            const rankedIds = new Set(entityRankRows.map((row) => row.entity_id));
            for (const id of catalogIds) {
                if (rankedIds.has(id)) continue;
                entityRankRows.push({ entity_id: id, pageviews: 0, unique_sessions: 0 });
                rankedIds.add(id);
            }

            const selectedDetailIds = compareIds.filter((id) => id !== WEB_PAGE_VISIT_INDEX_RANK_ID);
            const missingSelected = selectedDetailIds.filter((id) => !rankedIds.has(id));
            if (missingSelected.length > 0) {
                const missingResult = await serverRuntime.db.execute<EntityRankRow>(sql`
                    SELECT
                        ${param} AS entity_id,
                        COUNT(*)::int AS pageviews,
                        COUNT(DISTINCT e."sessionId")::int AS unique_sessions
                    FROM "SessionEvents" e
                    ${audience.join}
                    WHERE e.type = 'WEB_PAGE_VISITED'
                      AND ${audience.where}
                      AND ${storedWebPageKeyMatchSql(focusedKey)}
                      AND ${param} IN (${sql.join(
                          missingSelected.map((id) => sql`${id}`),
                          sql`, `,
                      )})
                      AND e."createdAt" >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
                      AND e."createdAt" < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
                    GROUP BY 1
                `);
                const missingRows = executeRows(missingResult);
                const missingById = new Map(missingRows.map((row) => [row.entity_id, row]));
                for (const id of missingSelected) {
                    entityRankRows.push(missingById.get(id) ?? { entity_id: id, pageviews: 0, unique_sessions: 0 });
                }
            }

            const previousEntityResult = await serverRuntime.db.execute<EntityRankRow>(sql`
                SELECT
                    ${param} AS entity_id,
                    COUNT(*)::int AS pageviews,
                    COUNT(DISTINCT e."sessionId")::int AS unique_sessions
                FROM "SessionEvents" e
                ${audience.join}
                WHERE e.type = 'WEB_PAGE_VISITED'
                  AND ${audience.where}
                  AND ${storedWebPageKeyMatchSql(focusedKey)}
                  AND ${param} IS NOT NULL
                  AND e."createdAt" >= date_trunc(${truncLiteral}, ${previous.startDateTime}::timestamptz)
                  AND e."createdAt" < date_trunc(${truncLiteral}, ${previous.endDateTime}::timestamptz) + ${step}
                GROUP BY 1
            `);
            previousEntityById = new Map();
            for (const row of executeRows(previousEntityResult)) {
                if (!row.entity_id) continue;
                previousEntityById.set(row.entity_id, {
                    previousPageviews: asInt(row.pageviews),
                    previousUniqueSessions: asInt(row.unique_sessions),
                });
            }

            const coverageResult = await serverRuntime.db.execute<{ entity_visit_count: string | number }>(sql`
                SELECT COUNT(*)::int AS entity_visit_count
                FROM "SessionEvents" e
                ${audience.join}
                WHERE e.type = 'WEB_PAGE_VISITED'
                  AND ${audience.where}
                  AND ${storedWebPageKeyMatchSql(focusedKey)}
                  AND ${param} IS NOT NULL
                  AND e."createdAt" >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
                  AND e."createdAt" < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
            `);
            entityVisitCount = asInt(executeRows(coverageResult)[0]?.entity_visit_count);

            const untaggedResult = await serverRuntime.db.execute<{ untagged_detail_visit_count: string | number }>(sql`
                SELECT COUNT(*)::int AS untagged_detail_visit_count
                FROM "SessionEvents" e
                ${audience.join}
                WHERE e.type = 'WEB_PAGE_VISITED'
                  AND ${audience.where}
                  AND ${storedWebPageKeyMatchSql(focusedKey)}
                  AND ${param} IS NULL
                  AND e.payload->>'path' ~ ${webPageVisitDetailPathPatternByKey[focusedKey]}
                  AND e."createdAt" >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
                  AND e."createdAt" < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
            `);
            untaggedDetailVisitCount = asInt(executeRows(untaggedResult)[0]?.untagged_detail_visit_count);

            if (comparing || args.scope !== 'DETAIL') {
                const indexResult = await serverRuntime.db.execute<{ pageviews: string | number; unique_sessions: string | number }>(sql`
                    SELECT
                        COUNT(*)::int AS pageviews,
                        COUNT(DISTINCT e."sessionId")::int AS unique_sessions
                    FROM "SessionEvents" e
                    ${audience.join}
                    WHERE e.type = 'WEB_PAGE_VISITED'
                      AND ${audience.where}
                      AND ${storedWebPageKeyMatchSql(focusedKey)}
                      AND ${indexVisitSql(focusedKey)}
                      AND e."createdAt" >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
                      AND e."createdAt" < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
                `);
                const indexPageviews = asInt(executeRows(indexResult)[0]?.pageviews);
                const previousIndexResult = await serverRuntime.db.execute<{
                    pageviews: string | number;
                    unique_sessions: string | number;
                }>(sql`
                    SELECT
                        COUNT(*)::int AS pageviews,
                        COUNT(DISTINCT e."sessionId")::int AS unique_sessions
                    FROM "SessionEvents" e
                    ${audience.join}
                    WHERE e.type = 'WEB_PAGE_VISITED'
                      AND ${audience.where}
                      AND ${storedWebPageKeyMatchSql(focusedKey)}
                      AND ${indexVisitSql(focusedKey)}
                      AND e."createdAt" >= date_trunc(${truncLiteral}, ${previous.startDateTime}::timestamptz)
                      AND e."createdAt" < date_trunc(${truncLiteral}, ${previous.endDateTime}::timestamptz) + ${step}
                `);
                const previousIndex = executeRows(previousIndexResult)[0];
                if (indexPageviews > 0 || compareIds.includes(WEB_PAGE_VISIT_INDEX_RANK_ID)) {
                    indexRank = {
                        id: WEB_PAGE_VISIT_INDEX_RANK_ID,
                        label: t(locale, 'admin', 'traffic.overviewPage'),
                        pathName: null,
                        pageviews: indexPageviews,
                        uniqueSessions: asInt(executeRows(indexResult)[0]?.unique_sessions),
                        previousPageviews: asInt(previousIndex?.pageviews),
                        previousUniqueSessions: asInt(previousIndex?.unique_sessions),
                    };
                }
            }
        }

        const overall = await fetchOverall(serverRuntime, fromWhere);
        const previousOverall = await fetchOverall(serverRuntime, previousFromWhere);

        let series: GqlSAdminWebPageVisitSeries[] = [];
        if (comparing && focusedKey) {
            const detailIds = compareIds.filter((id) => id !== WEB_PAGE_VISIT_INDEX_RANK_ID);
            const param = entityParamExpr(focusedKey);
            const labeledDetails =
                detailIds.length > 0
                    ? await entityRanksLabel(
                          detailIds.map((id) => {
                              const ranked = entityRankRows.find((row) => row.entity_id === id);
                              return ranked ?? { entity_id: id, pageviews: 0, unique_sessions: 0 };
                          }),
                          focusedKey,
                          locale,
                          serverRuntime,
                          previousEntityById,
                      )
                    : [];
            const labelById = new Map(labeledDetails.map((row) => [row.id, row]));
            if (indexRank) labelById.set(WEB_PAGE_VISIT_INDEX_RANK_ID, indexRank);

            for (const id of compareIds) {
                const isOverview = id === WEB_PAGE_VISIT_INDEX_RANK_ID;
                const seriesJoin = sql`CROSS JOIN (SELECT ${id}::text AS series_key) AS keys`;
                const seriesSelectKey = sql`keys.series_key`;
                const countsGroupKey = isOverview ? sql`${WEB_PAGE_VISIT_INDEX_RANK_ID}::text` : param;
                const countsJoinKey = sql`counts.series_key = keys.series_key`;
                const compareFromWhere = sql`
                    FROM "SessionEvents" e
                    ${audience.join}
                    WHERE e.type = 'WEB_PAGE_VISITED'
                      AND ${audience.where}
                      AND ${storedWebPageKeyMatchSql(focusedKey)}
                      AND ${isOverview ? indexVisitSql(focusedKey) : sql`${param} = ${id}`}
                      AND e."createdAt" >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
                      AND e."createdAt" < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
                `;
                const comparePreviousFromWhere = sql`
                    FROM "SessionEvents" e
                    ${audience.join}
                    WHERE e.type = 'WEB_PAGE_VISITED'
                      AND ${audience.where}
                      AND ${storedWebPageKeyMatchSql(focusedKey)}
                      AND ${isOverview ? indexVisitSql(focusedKey) : sql`${param} = ${id}`}
                      AND e."createdAt" >= date_trunc(${truncLiteral}, ${previous.startDateTime}::timestamptz)
                      AND e."createdAt" < date_trunc(${truncLiteral}, ${previous.endDateTime}::timestamptz) + ${step}
                `;
                const currentBuckets = await fetchBucketSeries(
                    serverRuntime,
                    currentWindow,
                    seriesJoin,
                    seriesSelectKey,
                    countsGroupKey,
                    countsJoinKey,
                    compareFromWhere,
                    args.metric,
                );
                const previousBuckets = await fetchBucketSeries(
                    serverRuntime,
                    previousParts,
                    seriesJoin,
                    seriesSelectKey,
                    countsGroupKey,
                    countsJoinKey,
                    comparePreviousFromWhere,
                    args.metric,
                );
                const buckets = currentBuckets.get(id) ?? [];
                const named = labelById.get(id);
                const previousTotals = isOverview
                    ? {
                          previousPageviews: indexRank?.previousPageviews ?? 0,
                          previousUniqueSessions: indexRank?.previousUniqueSessions ?? 0,
                      }
                    : (previousEntityById.get(id) ?? emptyPrevious());
                series.push({
                    webPageKey: focusedKey,
                    entityId: id,
                    label: named?.label || (isOverview ? t(locale, 'admin', 'traffic.overviewPage') : id),
                    buckets,
                    previousBuckets: alignPreviousBuckets(buckets, previousBuckets.get(id) ?? []),
                    pageviews: named?.pageviews ?? 0,
                    uniqueSessions: named?.uniqueSessions ?? 0,
                    previousPageviews: previousTotals.previousPageviews,
                    previousUniqueSessions: previousTotals.previousUniqueSessions,
                });
            }
        } else {
            const seriesJoin =
                keys.length === 0
                    ? sql``
                    : sql`CROSS JOIN (SELECT unnest(ARRAY[${sql.join(
                          keys.map((key) => sql`${key}`),
                          sql`, `,
                      )}]::text[]) AS series_key) AS keys`;
            const seriesSelectKey = keys.length === 0 ? sql`NULL::text` : sql`keys.series_key`;
            const countsGroupKey = keys.length === 0 ? sql`NULL::text` : webPageKeySql();
            const countsJoinKey = keys.length === 0 ? sql`true` : sql`counts.series_key = keys.series_key`;
            const currentBuckets = await fetchBucketSeries(
                serverRuntime,
                currentWindow,
                seriesJoin,
                seriesSelectKey,
                countsGroupKey,
                countsJoinKey,
                fromWhere,
                args.metric,
            );
            const previousBuckets = await fetchBucketSeries(
                serverRuntime,
                previousParts,
                seriesJoin,
                seriesSelectKey,
                countsGroupKey,
                countsJoinKey,
                previousFromWhere,
                args.metric,
            );
            const totalsByKey = await fetchTotalsByKey(serverRuntime, countsGroupKey, fromWhere);
            const previousTotalsByKey = await fetchTotalsByKey(serverRuntime, countsGroupKey, previousFromWhere);
            const seriesKeys: Array<GqlSWebPageKey | null> = keys.length === 0 ? [null] : keys;
            series = seriesKeys.map((key) => {
                const totals = totalsByKey.get(key) ?? { pageviews: 0, uniqueSessions: 0 };
                const previousTotals = previousTotalsByKey.get(key) ?? { pageviews: 0, uniqueSessions: 0 };
                const buckets = currentBuckets.get(key) ?? [];
                return {
                    webPageKey: key,
                    entityId: null,
                    label: seriesLabelForPageKey(key, locale),
                    buckets,
                    previousBuckets: alignPreviousBuckets(buckets, previousBuckets.get(key) ?? []),
                    pageviews: totals.pageviews,
                    uniqueSessions: totals.uniqueSessions,
                    previousPageviews: previousTotals.pageviews,
                    previousUniqueSessions: previousTotals.uniqueSessions,
                };
            });
        }

        const pageRanks: GqlSAdminWebPageVisitRank[] = executeRows(rankResult).flatMap((row) => {
            const webPageKey = webPageKeyParse(row.web_page_key);
            if (!webPageKey) return [];
            const previousTotals = previousRankByKey.get(row.web_page_key) ?? emptyPrevious();
            return [
                {
                    webPageKey,
                    pageviews: asInt(row.pageviews),
                    uniqueSessions: asInt(row.unique_sessions),
                    previousPageviews: previousTotals.previousPageviews,
                    previousUniqueSessions: previousTotals.previousUniqueSessions,
                },
            ];
        });

        const detailRanks = focusedKey ? await entityRanksLabel(entityRankRows, focusedKey, locale, serverRuntime, previousEntityById) : [];
        const showIndex = Boolean(indexRank) && (comparing || args.scope !== 'DETAIL');
        const scopedDetails = !comparing && args.scope === 'INDEX' ? [] : detailRanks;
        const metricOf = (row: GqlSAdminWebPageVisitEntityRank) => (args.metric === 'UNIQUE_SESSIONS' ? row.uniqueSessions : row.pageviews);
        scopedDetails.sort((left, right) => metricOf(right) - metricOf(left) || left.label.localeCompare(right.label, locale));
        const selectedSet = new Set(compareIds);
        const pinnedSelected = scopedDetails.filter((row) => selectedSet.has(row.id));
        const rest = scopedDetails.filter((row) => !selectedSet.has(row.id));
        const entityRanks = showIndex && indexRank ? [indexRank, ...pinnedSelected, ...rest] : [...pinnedSelected, ...rest];

        return {
            series,
            pageviews: overall.pageviews,
            uniqueSessions: overall.uniqueSessions,
            previousPageviews: previousOverall.pageviews,
            previousUniqueSessions: previousOverall.uniqueSessions,
            pageRanks,
            entityRanks,
            entityVisitCount,
            untaggedDetailVisitCount,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
