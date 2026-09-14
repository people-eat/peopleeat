import { avg, eq } from 'drizzle-orm';

import { giftCards } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

/** Average original balance (cents) among paid gift-card purchases, all-time. 0 when none. */
export async function adminGiftCardPaidPurchaseAverageCentsFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number> {
    try {
        const [row] = await serverRuntime.db
            .select({ averageCents: avg(giftCards.originalBalanceCents) })
            .from(giftCards)
            .where(eq(giftCards.paymentStatus, 'PAYED'));

        if (row?.averageCents == null) return 0;
        return Math.round(Number(row.averageCents));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
