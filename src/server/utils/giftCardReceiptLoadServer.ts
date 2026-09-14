import { notFound } from '@tanstack/react-router';
import { and, eq } from 'drizzle-orm';

import type { GiftCardReceiptPageProps } from '../../web/pages/GiftCardReceiptPage';
import { db } from '../db';
import { giftCards } from '../db/schema';
import { verifyServerToken } from './serverToken';

// Server-only loader body for `/server/gift-cards/:id/receipt`. Kept in its own
// module so the route file can `import()` it from `createIsomorphicFn().server`
// without pulling `pg` / `node:crypto` into the client route tree.

export async function giftCardReceiptLoadServer(input: { giftCardId: string; token: string }): Promise<GiftCardReceiptPageProps> {
    if (!verifyServerToken(input.token, input.giftCardId)) {
        throw notFound();
    }

    const [row] = await db
        .select()
        .from(giftCards)
        .where(and(eq(giftCards.giftCardId, input.giftCardId), eq(giftCards.paymentStatus, 'PAYED')))
        .limit(1);

    if (!row?.invoiceAddress) {
        throw notFound();
    }

    return {
        giftCard: {
            giftCardId: row.giftCardId,
            locale: row.locale,
            originalBalanceCents: row.originalBalanceCents,
            redeemCode: row.redeemCode,
            createdAt: row.createdAt,
        },
        invoiceAddress: {
            companyName: row.invoiceAddress.companyName ?? null,
            firstName: row.invoiceAddress.firstName,
            lastName: row.invoiceAddress.lastName,
            country: row.invoiceAddress.country,
            city: row.invoiceAddress.city,
            postalCode: row.invoiceAddress.postalCode,
            line1: row.invoiceAddress.line1,
            line2: row.invoiceAddress.line2,
        },
    };
}
