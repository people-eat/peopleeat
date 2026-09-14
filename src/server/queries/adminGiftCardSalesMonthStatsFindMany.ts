import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminGiftCardSalesMonthStat, GqlSAdminGiftCardSalesMonthStatsArgs, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';
import { findManyTake } from '../utils/findManyTake';

/** Top calendar months among paid gift-card purchases (optional range; omit for all-time), by purchase count. */
export async function adminGiftCardSalesMonthStatsFindMany(
    args: GqlSAdminGiftCardSalesMonthStatsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminGiftCardSalesMonthStat[]> {
    try {
        const take = findManyTake(args.take);
        const rangeFilter =
            args.range != null
                ? (() => {
                      const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
                      return sql`AND "createdAt" >= ${startDateTime} AND "createdAt" <= ${endDateTime}`;
                  })()
                : sql``;

        const result = await serverRuntime.db.execute<{
            month_start: Date;
            purchase_count: string | number;
            total_original_balance_cents: string | number;
        }>(sql`
            SELECT
                date_trunc('month', "createdAt") AS month_start,
                COUNT(*)::int AS purchase_count,
                COALESCE(SUM("originalBalanceCents"), 0)::int AS total_original_balance_cents
            FROM "GiftCards"
            WHERE "paymentStatus" = 'PAYED'
              ${rangeFilter}
            GROUP BY 1
            ORDER BY purchase_count DESC, month_start ASC
            LIMIT ${take}
        `);

        const rows = Array.isArray(result) ? result : result.rows;

        return rows.map((row) => ({
            monthStart: row.month_start instanceof Date ? row.month_start : new Date(row.month_start),
            count: typeof row.purchase_count === 'number' ? row.purchase_count : Number(row.purchase_count),
            totalOriginalBalanceCents:
                typeof row.total_original_balance_cents === 'number'
                    ? row.total_original_balance_cents
                    : Number(row.total_original_balance_cents),
        }));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
