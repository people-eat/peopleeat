import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminGiftCardPaidPurchaseRangeCentsArgs, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';

/** Paid gift-card GMV in range by COALESCE(payedAt, createdAt). 0 when none. */
export async function adminGiftCardPaidPurchaseRangeCentsFindOne(
    args: GqlSAdminGiftCardPaidPurchaseRangeCentsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
        const result = await serverRuntime.db.execute<{ total_cents: string | number | null }>(sql`
            SELECT COALESCE(SUM("originalBalanceCents"), 0)::int AS total_cents
            FROM "GiftCards"
            WHERE "paymentStatus" = 'PAYED'
              AND COALESCE("payedAt", "createdAt") >= ${startDateTime}
              AND COALESCE("payedAt", "createdAt") <= ${endDateTime}
        `);
        const rows = Array.isArray(result) ? result : result.rows;
        const total = rows[0]?.total_cents;
        if (total == null) return 0;
        return typeof total === 'number' ? total : Number(total);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
