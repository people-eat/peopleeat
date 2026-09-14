import { eq } from 'drizzle-orm';

import { promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/**
 * Validates a promo-code assignment for a content page (partner / occasion).
 * Null clears the assignment. Scoped (booking-request-bound) codes cannot be
 * attached because they are not redeemable by new customers.
 */
export async function resolveAssignedPromoCodeId(
    promoCodeId: string | null | undefined,
    serverRuntime: ServerRuntime,
): Promise<string | null> {
    if (promoCodeId == null || promoCodeId === '') {
        return null;
    }

    const [promoCode] = await serverRuntime.db
        .select({ promoCodeId: promoCodes.promoCodeId, bookingRequestId: promoCodes.bookingRequestId })
        .from(promoCodes)
        .where(eq(promoCodes.promoCodeId, promoCodeId))
        .limit(1);

    if (!promoCode) {
        throw new Error('resolveAssignedPromoCodeId: promo code not found');
    }

    if (promoCode.bookingRequestId) {
        throw new Error('resolveAssignedPromoCodeId: scoped promo codes cannot be assigned to content pages');
    }

    return promoCode.promoCodeId;
}
