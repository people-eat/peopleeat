import { eq } from 'drizzle-orm';

import { occasions, promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSOccasionPromo, GqlSSession } from '../graphql/generated';

/**
 * Resolves the public promo banner for an occasion. Returns null when the
 * occasion has no assignment, the code is booking-request-scoped, or it
 * has expired — so the CTA card hides itself without extra client logic.
 */
export async function occasionPromoFindOne(
    occasionId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSOccasionPromo | null> {
    try {
        const [row] = await serverRuntime.db
            .select({
                redeemCode: promoCodes.redeemCode,
                amountCents: promoCodes.amountCents,
                expiresAt: promoCodes.expiresAt,
                bookingRequestId: promoCodes.bookingRequestId,
            })
            .from(occasions)
            .innerJoin(promoCodes, eq(occasions.promoCodeId, promoCodes.promoCodeId))
            .where(eq(occasions.occasionId, occasionId))
            .limit(1);

        if (!row || row.bookingRequestId || row.expiresAt <= new Date()) {
            return null;
        }

        return { redeemCode: row.redeemCode, amountCents: row.amountCents };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        return null;
    }
}
