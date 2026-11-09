import { eq } from 'drizzle-orm';

import { partnerVenues, promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPartnerVenuePromo, GqlSSession } from '../graphql/generated';

/**
 * Resolves the public promo banner for a partner venue. Returns null when the
 * venue has no assignment, the code is booking-request-scoped, or it has
 * expired — so the CTA card hides itself without extra client logic.
 */
export async function partnerVenuePromoFindOne(
    partnerVenueId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSPartnerVenuePromo | null> {
    try {
        const [row] = await serverRuntime.db
            .select({
                redeemCode: promoCodes.redeemCode,
                amountCents: promoCodes.amountCents,
                expiresAt: promoCodes.expiresAt,
                bookingRequestId: promoCodes.bookingRequestId,
            })
            .from(partnerVenues)
            .innerJoin(promoCodes, eq(partnerVenues.promoCodeId, promoCodes.promoCodeId))
            .where(eq(partnerVenues.partnerVenueId, partnerVenueId))
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
