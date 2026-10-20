import { and, count, desc, gte, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { outboundEmails } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminOutboundEmailPurposeStat, GqlSAdminOutboundEmailPurposeStatsArgs, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';
import { findManyTake } from '../utils/findManyTake';

/** Top purposes among outbound emails (optional range; omit for all-time), by send count. */
export async function adminOutboundEmailPurposeStatsFindMany(
    args: GqlSAdminOutboundEmailPurposeStatsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminOutboundEmailPurposeStat[]> {
    try {
        const take = findManyTake(args.take);
        const filters: SQL[] = [];
        if (args.range != null) {
            const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
            filters.push(gte(outboundEmails.createdAt, startDateTime), lte(outboundEmails.createdAt, endDateTime));
        }

        const rows = await serverRuntime.db
            .select({
                purpose: outboundEmails.purpose,
                sendCount: count(),
            })
            .from(outboundEmails)
            .where(filters.length > 0 ? and(...filters) : undefined)
            .groupBy(outboundEmails.purpose)
            .orderBy(desc(count()), outboundEmails.purpose)
            .limit(take);

        return rows.map((row) => ({
            purpose: row.purpose,
            count: row.sendCount,
        }));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
