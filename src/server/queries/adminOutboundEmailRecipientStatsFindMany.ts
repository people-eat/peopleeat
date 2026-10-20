import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { outboundEmails, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminOutboundEmailRecipientStat, GqlSAdminOutboundEmailRecipientStatsArgs, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';
import { findManyTake } from '../utils/findManyTake';

/** Top recipients among outbound emails (optional range; omit for all-time), by send count. */
export async function adminOutboundEmailRecipientStatsFindMany(
    args: GqlSAdminOutboundEmailRecipientStatsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminOutboundEmailRecipientStat[]> {
    try {
        const take = findManyTake(args.take);
        const filters: SQL[] = [];
        if (args.range != null) {
            const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
            filters.push(gte(outboundEmails.createdAt, startDateTime), lte(outboundEmails.createdAt, endDateTime));
        }

        const rows = await serverRuntime.db
            .select({
                toEmail: outboundEmails.toEmail,
                sendCount: count(),
                userId: sql<string | null>`(array_agg(${outboundEmails.userId}) FILTER (WHERE ${outboundEmails.userId} IS NOT NULL))[1]`,
                displayName: sql<string | null>`(array_agg(${users.firstName}) FILTER (WHERE ${outboundEmails.userId} IS NOT NULL))[1]`,
            })
            .from(outboundEmails)
            .leftJoin(users, eq(users.userId, outboundEmails.userId))
            .where(filters.length > 0 ? and(...filters) : undefined)
            .groupBy(outboundEmails.toEmail)
            .orderBy(desc(count()), outboundEmails.toEmail)
            .limit(take);

        return rows.map((row) => ({
            toEmail: row.toEmail,
            count: row.sendCount,
            userId: row.userId ?? null,
            displayName: row.displayName ?? null,
        }));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
