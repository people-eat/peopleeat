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
    webPageKeyStoredValues,
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
    web_page_key: string | null;
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

function entityParamExpr(key: WebPageKeyWithVisitEntity): ReturnType<typeof sql.raw> {
    if (key === 'VENUES') {
        return sql.raw(
            `COALESCE(e.payload->'params'->>'partnerVenueId', e.payload->'params'->>'partnerId', e.payload->'params'->>'venueId')`,
        );
    }
    return sql.raw(`e.payload->'params'->>'${webPageVisitEntityParamByKey[key]}'`);
}

function canonicalWebPageKeySql() {
    return sql`CASE e.payload->>'webPageKey' WHEN 'PARTNERS' THEN 'VENUES' ELSE e.payload->>'webPageKey' END`;
}

function storedWebPageKeyMatchSql(key: WebPageKey) {
    const storedKeys = webPageKeyStoredValues(key);
    return sql`e.payload->>'webPageKey' IN (${sql.join(
        storedKeys.map((stored) => sql`${stored}`),
        sql`, `,
    )})`;
}

function entityIdFromInput(key: WebPageKeyWithVisitEntity, entity: GqlSAdminWebPageVisitEntity | null | undefined): string | null {
    if (!entity) return null;
    if (key === 'CHEFS') return entity.cookId ?? null;
    if (key === 'CITIES') return entity.cityId ?? null;
    if (key === 'VENUES') return entity.partnerVenueId ?? null;
    if (key === 'OCCASIONS') return entity.occasionId ?? null;
    return entity.blogPostId ?? null;
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
    entityId: string | null;
}): ReturnType<typeof sql> {
    const storedKeys = args.keys.flatMap((key) => webPageKeyStoredValues(key));
    const keyFilter =
        storedKeys.length === 0
            ? sql`true`
            : sql`e.payload->>'webPageKey' IN (${sql.join(
                  storedKeys.map((key) => sql`${key}`),
                  sql`, `,
              )})`;

    let entityFilter = sql`true`;
    if (args.focusedKey) {
        const param = entityParamExpr(args.focusedKey);
        if (args.entityId) {
            entityFilter = sql`${param} = ${args.entityId}`;
        } else if (args.scope === 'INDEX') {
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

async function entityRanksLabel(
    rows: EntityRankRow[],
    key: WebPageKeyWithVisitEntity,
    locale: Locale,
    serverRuntime: ServerRuntime,
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
        return {
            id: row.entity_id,
            label: named?.label || row.entity_id,
            pathName: named?.pathName ?? null,
            pageviews: asInt(row.pageviews),
            uniqueSessions: asInt(row.unique_sessions),
        };
    });
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
        const focusedKey = keys.length === 1 && keys[0] && webPageKeyHasVisitEntity(keys[0]) ? keys[0] : null;
        const entityId = focusedKey ? entityIdFromInput(focusedKey, args.entity) : null;
        const audience = adminWebPageVisitAudienceSql(args.audience);
        const fromWhere = visitWhereSql({
            audienceJoin: audience.join,
            audienceWhere: audience.where,
            startDateTime,
            endDateTime,
            truncLiteral,
            step,
            keys,
            scope: args.scope,
            focusedKey,
            entityId,
        });

        const seriesJoin =
            keys.length === 0
                ? sql``
                : sql`CROSS JOIN (SELECT unnest(ARRAY[${sql.join(
                      keys.map((key) => sql`${key}`),
                      sql`, `,
                  )}]::text[]) AS web_page_key) AS keys`;

        const seriesSelectKey = keys.length === 0 ? sql`NULL::text` : sql`keys.web_page_key`;
        const countsGroupKey = keys.length === 0 ? sql`NULL::text` : canonicalWebPageKeySql();
        const countsJoinKey = keys.length === 0 ? sql`true` : sql`counts.web_page_key = keys.web_page_key`;

        const seriesResult = await serverRuntime.db.execute<BucketCountRow>(sql`
            SELECT
                series.bucket_start AS bucket_start,
                ${seriesSelectKey} AS web_page_key,
                COALESCE(counts.pageviews, 0)::int AS pageviews,
                COALESCE(counts.unique_sessions, 0)::int AS unique_sessions
            FROM generate_series(
                date_trunc(${truncLiteral}, ${startDateTime}::timestamptz),
                date_trunc(${truncLiteral}, ${endDateTime}::timestamptz),
                ${step}
            ) AS series(bucket_start)
            ${seriesJoin}
            LEFT JOIN (
                SELECT
                    date_trunc(${truncLiteral}, e."createdAt") AS bucket_start,
                    ${countsGroupKey} AS web_page_key,
                    COUNT(*)::int AS pageviews,
                    COUNT(DISTINCT e."sessionId")::int AS unique_sessions
                ${fromWhere}
                GROUP BY 1, 2
            ) AS counts
                ON counts.bucket_start = series.bucket_start
               AND ${countsJoinKey}
            ORDER BY series.bucket_start ASC, web_page_key ASC NULLS FIRST
        `);
        const seriesRows = Array.isArray(seriesResult) ? seriesResult : seriesResult.rows;

        const rankResult = await serverRuntime.db.execute<RankRow>(sql`
            SELECT
                ${canonicalWebPageKeySql()} AS web_page_key,
                COUNT(*)::int AS pageviews,
                COUNT(DISTINCT e."sessionId")::int AS unique_sessions
            FROM "SessionEvents" e
            ${audience.join}
            WHERE e.type = 'WEB_PAGE_VISITED'
              AND ${audience.where}
              AND e."createdAt" >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
              AND e."createdAt" < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
            GROUP BY 1
            ORDER BY pageviews DESC, web_page_key ASC
        `);
        const rankRows = Array.isArray(rankResult) ? rankResult : rankResult.rows;

        let entityRankRows: EntityRankRow[] = [];
        let entityVisitCount = 0;
        let untaggedDetailVisitCount = 0;
        let indexRank: GqlSAdminWebPageVisitEntityRank | null = null;
        if (focusedKey) {
            const param = entityParamExpr(focusedKey);
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
                ORDER BY pageviews DESC, entity_id ASC
                LIMIT ${WEB_PAGE_VISIT_ENTITY_RANK_MAX}
            `);
            entityRankRows = (Array.isArray(entityResult) ? entityResult : entityResult.rows).filter((row) => Boolean(row.entity_id));

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
            const coverageRows = Array.isArray(coverageResult) ? coverageResult : coverageResult.rows;
            entityVisitCount = asInt(coverageRows[0]?.entity_visit_count);

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
            const untaggedRows = Array.isArray(untaggedResult) ? untaggedResult : untaggedResult.rows;
            untaggedDetailVisitCount = asInt(untaggedRows[0]?.untagged_detail_visit_count);

            if (args.scope !== 'DETAIL') {
                const indexResult = await serverRuntime.db.execute<{ pageviews: string | number; unique_sessions: string | number }>(sql`
                    SELECT
                        COUNT(*)::int AS pageviews,
                        COUNT(DISTINCT e."sessionId")::int AS unique_sessions
                    FROM "SessionEvents" e
                    ${audience.join}
                    WHERE e.type = 'WEB_PAGE_VISITED'
                      AND ${audience.where}
                      AND ${storedWebPageKeyMatchSql(focusedKey)}
                      AND ${param} IS NULL
                      AND (
                        e.payload->>'path' IS NULL
                        OR e.payload->>'path' !~ ${webPageVisitDetailPathPatternByKey[focusedKey]}
                      )
                      AND e."createdAt" >= date_trunc(${truncLiteral}, ${startDateTime}::timestamptz)
                      AND e."createdAt" < date_trunc(${truncLiteral}, ${endDateTime}::timestamptz) + ${step}
                `);
                const indexRows = Array.isArray(indexResult) ? indexResult : indexResult.rows;
                const indexPageviews = asInt(indexRows[0]?.pageviews);
                if (indexPageviews > 0) {
                    indexRank = {
                        id: WEB_PAGE_VISIT_INDEX_RANK_ID,
                        label: t(locale, 'admin', 'traffic.overviewPage'),
                        pathName: null,
                        pageviews: indexPageviews,
                        uniqueSessions: asInt(indexRows[0]?.unique_sessions),
                    };
                }
            }
        }

        const totalsResult = await serverRuntime.db.execute<BucketCountRow>(sql`
            SELECT
                ${countsGroupKey} AS web_page_key,
                COUNT(*)::int AS pageviews,
                COUNT(DISTINCT e."sessionId")::int AS unique_sessions,
                NULL::timestamptz AS bucket_start
            ${fromWhere}
            GROUP BY 1
        `);
        const totalsRows = Array.isArray(totalsResult) ? totalsResult : totalsResult.rows;
        const overallResult = await serverRuntime.db.execute<{ pageviews: string | number; unique_sessions: string | number }>(sql`
            SELECT
                COUNT(*)::int AS pageviews,
                COUNT(DISTINCT e."sessionId")::int AS unique_sessions
            ${fromWhere}
        `);
        const overallRows = Array.isArray(overallResult) ? overallResult : overallResult.rows;
        const overall = overallRows[0];

        const seriesByKey = new Map<string | null, GqlSAdminTimeBucket[]>();
        for (const row of seriesRows) {
            const key = row.web_page_key;
            const buckets = seriesByKey.get(key) ?? [];
            buckets.push({
                bucketStart: asDate(row.bucket_start),
                count: bucketCount(row, args.metric),
            });
            seriesByKey.set(key, buckets);
        }

        const totalsByKey = new Map<string | null, { pageviews: number; uniqueSessions: number }>();
        for (const row of totalsRows) {
            totalsByKey.set(row.web_page_key, {
                pageviews: asInt(row.pageviews),
                uniqueSessions: asInt(row.unique_sessions),
            });
        }

        const seriesKeys: Array<GqlSWebPageKey | null> = keys.length === 0 ? [null] : keys;
        const series: GqlSAdminWebPageVisitSeries[] = seriesKeys.map((key) => {
            const totals = totalsByKey.get(key) ?? { pageviews: 0, uniqueSessions: 0 };
            return {
                webPageKey: key,
                buckets: seriesByKey.get(key) ?? [],
                pageviews: totals.pageviews,
                uniqueSessions: totals.uniqueSessions,
            };
        });

        const pageRanks: GqlSAdminWebPageVisitRank[] = rankRows.flatMap((row) => {
            const webPageKey = webPageKeyParse(row.web_page_key);
            if (!webPageKey) return [];
            return [
                {
                    webPageKey,
                    pageviews: asInt(row.pageviews),
                    uniqueSessions: asInt(row.unique_sessions),
                },
            ];
        });

        const detailRanks = focusedKey ? await entityRanksLabel(entityRankRows, focusedKey, locale, serverRuntime) : [];
        const entityRanks = args.scope === 'INDEX' ? (indexRank ? [indexRank] : []) : indexRank ? [indexRank, ...detailRanks] : detailRanks;

        return {
            series,
            pageviews: asInt(overall?.pageviews),
            uniqueSessions: asInt(overall?.unique_sessions),
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
