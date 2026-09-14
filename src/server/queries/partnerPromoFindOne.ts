import { eq } from 'drizzle-orm';

import { partners, promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPartnerPromo, GqlSSession } from '../graphql/generated';

/**
 * Resolves the public promo banner for a partner. Returns null when the
 * partner has no assignment, the code is booking-request-scoped, or it
 * has expired — so the CTA card hides itself without extra client logic.
 */
export async function partnerPromoFindOne(
    partnerId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSPartnerPromo | null> {
    try {
        const [row] = await serverRuntime.db
            .select({
                redeemCode: promoCodes.redeemCode,
                amountCents: promoCodes.amountCents,
                expiresAt: promoCodes.expiresAt,
                bookingRequestId: promoCodes.bookingRequestId,
            })
            .from(partners)
            .innerJoin(promoCodes, eq(partners.promoCodeId, promoCodes.promoCodeId))
            .where(eq(partners.partnerId, partnerId))
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
