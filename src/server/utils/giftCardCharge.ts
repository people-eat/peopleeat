import { and, eq, sql } from 'drizzle-orm';

import { giftCards } from '../db/schema';
import type { GiftCard } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/**
 * Deducts `amountCents` from a gift card’s remaining balance.
 * Fails closed when the balance is insufficient (no silent floor-at-0).
 */
export async function giftCardCharge(serverRuntime: Pick<ServerRuntime, 'db'>, giftCard: GiftCard, amountCents: number): Promise<void> {
    if (amountCents <= 0) return;
    await giftCardChargeInTransaction(serverRuntime.db, giftCard.giftCardId, amountCents);
}

/** Same as {@link giftCardCharge} but inside an existing Drizzle transaction. */
export async function giftCardChargeInTransaction(
    transaction: { update: ServerRuntime['db']['update'] },
    giftCardId: string,
    amountCents: number,
): Promise<void> {
    if (amountCents <= 0) return;
    const updated = await transaction
        .update(giftCards)
        .set({
            balanceCents: sql`${giftCards.balanceCents} - ${amountCents}`,
        })
        .where(and(eq(giftCards.giftCardId, giftCardId), sql`${giftCards.balanceCents} >= ${amountCents}`))
        .returning({ giftCardId: giftCards.giftCardId });

    if (updated.length === 0) {
        throw new Error('giftCardCharge: insufficient gift card balance');
    }
}
