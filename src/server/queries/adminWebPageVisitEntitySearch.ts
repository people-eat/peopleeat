import { and, eq, ilike, or, sql } from 'drizzle-orm';

import { contentLocaleText } from '../../shared/contentSection';
import { DEFAULT_LOCALE } from '../../shared/locale';
import {
    WEB_PAGE_VISIT_ENTITY_RANK_MAX,
    WEB_PAGE_VISIT_ENTITY_SEARCH_MIN_QUERY,
    webPageKeyHasVisitEntity,
    webPageVisitEntityUsesPartnerVenue,
} from '../../shared/webPage';
import type { WebPageKeyWithVisitEntity } from '../../shared/webPage';
import { blogPosts, cities, cooks, occasions, partnerVenues, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminWebPageVisitAudience,
    GqlSAdminWebPageVisitEntityRank,
    GqlSDateTimeRange,
    GqlSSession,
    GqlSWebPageKey,
} from '../graphql/generated';
import { adminWebPageVisitAudienceSql } from '../utils/adminWebPageVisitAudienceSql';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';
import { userLocaleRequire } from '../utils/userLocaleRequire';
import { entityParamExpr, storedWebPageKeyMatchSql } from './adminWebPageVisitTrafficFindOne';

function asInt(value: string | number | null | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    return 0;
}

function ilikeContains(query: string): string {
    return `%${query.replace(/[%_\\]/g, '\\$&')}%`;
}

type NamedEntity = { id: string; label: string; pathName: string | null };

async function searchNamedEntities(
    key: WebPageKeyWithVisitEntity,
    query: string,
    locale: Awaited<ReturnType<typeof userLocaleRequire>> | typeof DEFAULT_LOCALE,
    serverRuntime: ServerRuntime,
): Promise<NamedEntity[]> {
    const pattern = ilikeContains(query);

    if (key === 'CHEFS') {
        const rows = await serverRuntime.db
            .select({
                cookId: cooks.cookId,
                pathName: cooks.pathName,
                firstName: users.firstName,
                lastName: users.lastName,
                stageName: cooks.stageName,
            })
            .from(cooks)
            .innerJoin(users, eq(users.userId, cooks.cookId))
            .where(
                or(
                    ilike(users.firstName, pattern),
                    ilike(users.lastName, pattern),
                    ilike(cooks.pathName, pattern),
                    and(sql`${cooks.stageName} IS NOT NULL`, ilike(cooks.stageName, pattern)),
                    ilike(sql`(${users.firstName} || ' ' || ${users.lastName})`, pattern),
                ),
            )
            .limit(WEB_PAGE_VISIT_ENTITY_RANK_MAX);
        return rows.map((row) => ({
            id: row.cookId,
            label: (row.stageName?.trim() || `${row.firstName} ${row.lastName}`.trim() || row.pathName).trim(),
            pathName: row.pathName,
        }));
    }

    if (key === 'CITIES') {
        const rows = await serverRuntime.db
            .select({ cityId: cities.cityId, pathName: cities.pathName, nameDe: cities.nameDe, nameEn: cities.nameEn })
            .from(cities)
            .where(or(ilike(cities.nameDe, pattern), ilike(cities.nameEn, pattern), ilike(cities.pathName, pattern)))
            .limit(WEB_PAGE_VISIT_ENTITY_RANK_MAX);
        return rows.map((row) => ({
            id: row.cityId,
            label: contentLocaleText(row.nameDe, row.nameEn, locale),
            pathName: row.pathName,
        }));
    }

    if (webPageVisitEntityUsesPartnerVenue(key)) {
        const rows = await serverRuntime.db
            .select({ partnerVenueId: partnerVenues.partnerVenueId, pathName: partnerVenues.pathName, name: partnerVenues.name })
            .from(partnerVenues)
            .where(or(ilike(partnerVenues.name, pattern), ilike(partnerVenues.pathName, pattern)))
            .limit(WEB_PAGE_VISIT_ENTITY_RANK_MAX);
        return rows.map((row) => ({ id: row.partnerVenueId, label: row.name, pathName: row.pathName }));
    }

    if (key === 'OCCASIONS') {
        const rows = await serverRuntime.db
            .select({ occasionId: occasions.occasionId, pathName: occasions.pathName, name: occasions.name })
            .from(occasions)
            .where(or(ilike(occasions.name, pattern), ilike(occasions.pathName, pattern)))
            .limit(WEB_PAGE_VISIT_ENTITY_RANK_MAX);
        return rows.map((row) => ({ id: row.occasionId, label: row.name, pathName: row.pathName }));
    }

    const rows = await serverRuntime.db
        .select({
            blogPostId: blogPosts.blogPostId,
            pathName: blogPosts.pathName,
            titleDe: blogPosts.titleDe,
            titleEn: blogPosts.titleEn,
        })
        .from(blogPosts)
        .where(or(ilike(blogPosts.titleDe, pattern), ilike(blogPosts.titleEn, pattern), ilike(blogPosts.pathName, pattern)))
        .limit(WEB_PAGE_VISIT_ENTITY_RANK_MAX);
    return rows.map((row) => ({
        id: row.blogPostId,
        label: contentLocaleText(row.titleDe, row.titleEn, locale),
        pathName: row.pathName,
    }));
}

export async function adminWebPageVisitEntitySearch(
    args: {
        webPageKey: GqlSWebPageKey;
        query: string;
        range: GqlSDateTimeRange;
        audience: GqlSAdminWebPageVisitAudience;
    },
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminWebPageVisitEntityRank[]> {
    try {
        const query = args.query.trim();
        if (query.length < WEB_PAGE_VISIT_ENTITY_SEARCH_MIN_QUERY) return [];
        if (!webPageKeyHasVisitEntity(args.webPageKey)) return [];
        const focusedKey = args.webPageKey;
        const locale = requestingSession.userId ? await userLocaleRequire(serverRuntime, requestingSession.userId) : DEFAULT_LOCALE;
        const named = await searchNamedEntities(focusedKey, query, locale, serverRuntime);
        if (named.length === 0) return [];

        const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
        const audience = adminWebPageVisitAudienceSql(args.audience);
        const param = entityParamExpr(focusedKey);
        const ids = named.map((row) => row.id);
        const countsResult = await serverRuntime.db.execute<{
            entity_id: string;
            pageviews: string | number;
            unique_sessions: string | number;
        }>(sql`
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
                  ids.map((id) => sql`${id}`),
                  sql`, `,
              )})
              AND e."createdAt" >= ${startDateTime}::timestamptz
              AND e."createdAt" < ${endDateTime}::timestamptz
            GROUP BY 1
        `);
        const countRows = Array.isArray(countsResult) ? countsResult : countsResult.rows;
        const countsById = new Map(
            countRows.map((row) => [row.entity_id, { pageviews: asInt(row.pageviews), uniqueSessions: asInt(row.unique_sessions) }]),
        );

        return named
            .map((row) => {
                const counts = countsById.get(row.id) ?? { pageviews: 0, uniqueSessions: 0 };
                return {
                    id: row.id,
                    label: row.label,
                    pathName: row.pathName,
                    pageviews: counts.pageviews,
                    uniqueSessions: counts.uniqueSessions,
                    previousPageviews: 0,
                    previousUniqueSessions: 0,
                };
            })
            .sort((left, right) => right.pageviews - left.pageviews || left.label.localeCompare(right.label));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
