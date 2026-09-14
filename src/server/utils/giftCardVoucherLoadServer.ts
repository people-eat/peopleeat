import { notFound } from '@tanstack/react-router';
import { and, eq } from 'drizzle-orm';

import type { GiftCardVoucherPageProps } from '../../web/pages/GiftCardVoucherPage';
import { db } from '../db';
import { giftCards } from '../db/schema';
import { verifyServerToken } from './serverToken';

export async function giftCardVoucherLoadServer(input: { giftCardId: string; token: string }): Promise<GiftCardVoucherPageProps> {
    if (!verifyServerToken(input.token, input.giftCardId)) {
        throw notFound();
    }

    const [row] = await db
        .select()
        .from(giftCards)
        .where(and(eq(giftCards.giftCardId, input.giftCardId), eq(giftCards.paymentStatus, 'PAYED')))
        .limit(1);

    if (!row) {
        throw notFound();
    }

    return {
        giftCard: {
            giftCardId: row.giftCardId,
            locale: row.locale,
            originalBalanceCents: row.originalBalanceCents,
            redeemCode: row.redeemCode,
            recipientName: row.recipientName,
            occasion: row.occasion,
            message: row.message,
            expiresAt: row.expiresAt,
        },
    };
}
