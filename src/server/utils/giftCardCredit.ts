import { eq, sql } from 'drizzle-orm';

import { giftCards } from '../db/schema';
import type { GiftCard } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/** Restores `amountCents` to a gift card’s remaining balance, never above `originalBalanceCents`. */
export async function giftCardCreditInTransaction(
    transaction: { update: ServerRuntime['db']['update'] },
    giftCard: Pick<GiftCard, 'giftCardId' | 'originalBalanceCents'>,
    amountCents: number,
): Promise<void> {
    if (amountCents <= 0) return;
    await transaction
        .update(giftCards)
        .set({
            balanceCents: sql`least(${giftCards.originalBalanceCents}, ${giftCards.balanceCents} + ${amountCents})`,
        })
        .where(eq(giftCards.giftCardId, giftCard.giftCardId));
}
