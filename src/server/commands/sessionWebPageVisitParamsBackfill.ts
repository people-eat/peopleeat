import { eq, sql } from 'drizzle-orm';

import { isNanoId } from '../../shared/idCreate';
import { webPageKeyHasVisitEntity, webPageVisitEntityParamByKey } from '../../shared/webPage';
import { webPageKeyFromPath } from '../../shared/webPageKeyFromPath';
import { sessionEvents } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { SessionEventWebPageVisitedPayload } from '../domain/sessionEvent';
import { sessionWebPageVisitParamsResolve } from '../utils/sessionWebPageVisitParamsResolve';

const SESSION_WEB_PAGE_VISIT_PARAMS_BACKFILL_LIMIT = 200;

export type SessionWebPageVisitParamsBackfillResult = {
    scanned: number;
    updated: number;
    done: boolean;
};

type VisitRow = {
    sessionEventId: string;
    payload: SessionEventWebPageVisitedPayload;
};

/**
 * Fills missing catalog entity ids on historical WEB_PAGE_VISITED rows from
 * the stored public path. Chunked so a queued job can drain the table.
 */
export async function sessionWebPageVisitParamsBackfill(
    serverRuntime: ServerRuntime,
    options: { limit?: number } = {},
): Promise<SessionWebPageVisitParamsBackfillResult> {
    const limit = options.limit ?? SESSION_WEB_PAGE_VISIT_PARAMS_BACKFILL_LIMIT;

    const result = await serverRuntime.db.execute<VisitRow>(sql`
        SELECT "sessionEventId" AS "sessionEventId", payload
        FROM "SessionEvents"
        WHERE type = 'WEB_PAGE_VISITED'
          AND (
            payload->>'path' ~ '^/(cities|venues|partners|occasions|blog-posts|chefs)/[^/]+/?$'
            OR payload->>'path' ~ '^/booking-request/plan/?\\?(?:[^#]*&)?(?:venueId|partnerId)='
          )
          AND (
            payload->'params' IS NULL
            OR (
                payload->>'webPageKey' = 'CITIES' AND payload->'params'->>'cityId' IS NULL
            )
            OR (
                payload->>'webPageKey' = 'VENUES' AND payload->'params'->>'partnerVenueId' IS NULL
            )
            OR (
                payload->>'webPageKey' = 'BOOKING_REQUEST_PLAN' AND payload->'params'->>'partnerVenueId' IS NULL
            )
            OR (
                payload->>'webPageKey' = 'OCCASIONS' AND payload->'params'->>'occasionId' IS NULL
            )
            OR (
                payload->>'webPageKey' = 'BLOG_POSTS' AND payload->'params'->>'blogPostId' IS NULL
            )
            OR (
                payload->>'webPageKey' = 'CHEFS' AND payload->'params'->>'cookId' IS NULL
            )
          )
        ORDER BY "sessionEventId" ASC
        LIMIT ${limit}
    `);
    const rows = Array.isArray(result) ? result : result.rows;

    const updates: Array<{ sessionEventId: string; payload: SessionEventWebPageVisitedPayload }> = [];
    for (const row of rows) {
        const path = row.payload.path;
        if (!path) continue;
        const match = webPageKeyFromPath(path);
        if (!match?.params || !webPageKeyHasVisitEntity(match.webPageKey)) continue;

        const storedParams = row.payload.params;
        const paramKey = webPageVisitEntityParamByKey[match.webPageKey];
        const existingId = storedParams?.[paramKey];
        if (existingId && isNanoId(existingId)) continue;

        const resolved = await sessionWebPageVisitParamsResolve(serverRuntime.db, match.params);
        if (!resolved) continue;

        updates.push({
            sessionEventId: row.sessionEventId,
            payload: {
                ...row.payload,
                params: { ...row.payload.params, ...resolved },
            },
        });
    }

    try {
        for (const update of updates) {
            await serverRuntime.db
                .update(sessionEvents)
                .set({ payload: update.payload })
                .where(eq(sessionEvents.sessionEventId, update.sessionEventId));
        }
    } catch (error) {
        serverRuntime.log.error(error, null);
        throw error;
    }

    return {
        scanned: rows.length,
        updated: updates.length,
        done: rows.length < limit,
    };
}
