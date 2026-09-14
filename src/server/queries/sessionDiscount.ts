import { and, eq, gt, isNull, ne } from 'drizzle-orm';

import { giftCards, promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSSessionDiscount, GqlSSessionDiscountArgs } from '../graphql/generated';

/**
 * Public discount preview. Booking-scoped (churn) promo codes are excluded —
 * they must not surface on partner CTAs or public form previews.
 */
export async function sessionDiscount(
    args: GqlSSessionDiscountArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSSessionDiscount | null> {
    const redeemCode = args.redeemCode.trim();
    if (redeemCode.length === 0) {
        return null;
    }

    const now = new Date();

    try {
        const [[giftCard], [promoCode]] = await Promise.all([
            serverRuntime.db
                .select()
                .from(giftCards)
                .where(
                    and(
                        eq(giftCards.redeemCode, redeemCode),
                        gt(giftCards.expiresAt, now),
                        eq(giftCards.paymentStatus, 'PAYED'),
                        ne(giftCards.balanceCents, 0),
                    ),
                )
                .limit(1),
            serverRuntime.db
                .select()
                .from(promoCodes)
                .where(and(eq(promoCodes.redeemCode, redeemCode), gt(promoCodes.expiresAt, now), isNull(promoCodes.bookingRequestId)))
                .limit(1),
        ]);

        if (giftCard) {
            return {
                redeemCode,
                name: `Gutschein ${giftCard.redeemCode}`,
                amountCents: giftCard.balanceCents,
            };
        }

        if (promoCode) {
            return {
                redeemCode,
                name: `Promocode ${promoCode.redeemCode}`,
                amountCents: promoCode.amountCents,
            };
        }

        return null;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        return null;
    }
}
