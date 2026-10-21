import { eq, sql } from 'drizzle-orm';

import { giftCards } from '../db/schema';
import type { GiftCard } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/**
 * Deducts `amountCents` from a gift card’s remaining balance (floors at 0).
 * Used when a dual-accepted booking consumes an applied gift card.
 */
export async function giftCardCharge(serverRuntime: Pick<ServerRuntime, 'db'>, giftCard: GiftCard, amountCents: number): Promise<void> {
    if (amountCents <= 0) return;
    const creditLeft = giftCard.balanceCents - amountCents;
    await serverRuntime.db
        .update(giftCards)
        .set({ balanceCents: creditLeft > 0 ? creditLeft : 0 })
        .where(eq(giftCards.giftCardId, giftCard.giftCardId));
}

/** Same as {@link giftCardCharge} but inside an existing Drizzle transaction. */
export async function giftCardChargeInTransaction(
    transaction: { update: ServerRuntime['db']['update'] },
    giftCardId: string,
    amountCents: number,
): Promise<void> {
    if (amountCents <= 0) return;
    await transaction
        .update(giftCards)
        .set({
            balanceCents: sql`greatest(0, ${giftCards.balanceCents} - ${amountCents})`,
        })
        .where(eq(giftCards.giftCardId, giftCardId));
}
