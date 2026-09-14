import { and, count, desc, eq, gte, lte, sum } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { giftCards } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminGiftCardOccasionStat, GqlSAdminGiftCardOccasionStatsArgs, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';
import { findManyTake } from '../utils/findManyTake';

/** Top occasions among paid gift-card purchases (optional range; omit for all-time), by purchase count. */
export async function adminGiftCardOccasionStatsFindMany(
    args: GqlSAdminGiftCardOccasionStatsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminGiftCardOccasionStat[]> {
    try {
        const take = findManyTake(args.take);
        const filters: SQL[] = [eq(giftCards.paymentStatus, 'PAYED')];
        if (args.range != null) {
            const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
            filters.push(gte(giftCards.createdAt, startDateTime), lte(giftCards.createdAt, endDateTime));
        }

        const rows = await serverRuntime.db
            .select({
                occasion: giftCards.occasion,
                purchaseCount: count(),
                totalOriginalBalanceCents: sum(giftCards.originalBalanceCents),
            })
            .from(giftCards)
            .where(and(...filters))
            .groupBy(giftCards.occasion)
            .orderBy(desc(count()), giftCards.occasion)
            .limit(take);

        return rows.map((row) => ({
            occasion: row.occasion,
            count: row.purchaseCount,
            totalOriginalBalanceCents: Number(row.totalOriginalBalanceCents ?? 0),
        }));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
