import { sql } from 'drizzle-orm';

import { webPageKeyParse } from '../../shared/webPage';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminWebPageVisitAudience, GqlSAdminWebPageVisitCount, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { adminWebPageVisitAudienceSql } from '../utils/adminWebPageVisitAudienceSql';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';

type CountRow = {
    web_page_key: string;
    pageviews: string | number;
};

export async function adminWebPageVisitCountFindMany(
    args: { range: GqlSDateTimeRange; audience: GqlSAdminWebPageVisitAudience },
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminWebPageVisitCount[]> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
        const audience = adminWebPageVisitAudienceSql(args.audience);
        const result = await serverRuntime.db.execute<CountRow>(sql`
            SELECT
                CASE e.payload->>'webPageKey' WHEN 'PARTNERS' THEN 'VENUES' ELSE e.payload->>'webPageKey' END AS web_page_key,
                COUNT(*)::int AS pageviews
            FROM "SessionEvents" e
            ${audience.join}
            WHERE e.type = 'WEB_PAGE_VISITED'
              AND ${audience.where}
              AND e."createdAt" >= ${startDateTime}
              AND e."createdAt" < ${endDateTime}
            GROUP BY 1
        `);
        const rows = Array.isArray(result) ? result : result.rows;
        return rows.flatMap((row) => {
            const webPageKey = webPageKeyParse(row.web_page_key);
            if (!webPageKey) return [];
            return [
                {
                    webPageKey,
                    pageviews: typeof row.pageviews === 'number' ? row.pageviews : Number(row.pageviews),
                },
            ];
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
