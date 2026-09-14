import { count, eq, sum } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { giftCards } from '../db/schema';
import type { GiftCardCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminGiftCardPaidPurchaseAverageCentsFindOne } from './adminGiftCardPaidPurchaseAverageCentsFindOne';

async function insertGiftCard(sessionId: string, overrides: Partial<GiftCardCreate> = {}): Promise<void> {
    const giftCardId = overrides.giftCardId ?? idCreate();
    await testDb.insert(giftCards).values({
        giftCardId,
        sessionId,
        buyerEmail: 'buyer@example.com',
        locale: 'en',
        occasion: 'Birthday',
        recipientName: 'Ada Lovelace',
        message: '',
        originalBalanceCents: 5000,
        balanceCents: 5000,
        redeemCode: `GC-${idCreate().slice(0, 8)}`,
        paymentIntentId: `pi_${giftCardId.slice(0, 8)}`,
        paymentClientSecret: `secret_${giftCardId.slice(0, 8)}`,
        paymentStatus: 'PAYED',
        expiresAt: new Date(Date.now() + 86_400_000),
        ...overrides,
    });
}

async function paidPurchaseTotals(): Promise<{ paidCount: number; totalCents: number }> {
    const [row] = await testDb
        .select({
            paidCount: count(),
            totalCents: sum(giftCards.originalBalanceCents),
        })
        .from(giftCards)
        .where(eq(giftCards.paymentStatus, 'PAYED'));
    return {
        paidCount: row?.paidCount ?? 0,
        totalCents: Number(row?.totalCents ?? 0),
    };
}

describe('adminGiftCardPaidPurchaseAverageCentsFindOne', () => {
    it('returns 0 when there are no paid purchases', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const { paidCount } = await paidPurchaseTotals();
        if (paidCount > 0) {
            // Shared test DB already has paid rows; skip the empty-DB assertion.
            expect(await adminGiftCardPaidPurchaseAverageCentsFindOne(requestingSession, serverRuntime)).toBeGreaterThan(0);
            return;
        }

        // Act
        const average = await adminGiftCardPaidPurchaseAverageCentsFindOne(requestingSession, serverRuntime);

        // Assert
        expect(average).toBe(0);
    });

    it('averages originalBalanceCents across paid rows only', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `avg-${idCreate().slice(0, 8)}`;
        const before = await paidPurchaseTotals();

        await insertGiftCard(requestingSession.sessionId, {
            occasion: token,
            paymentStatus: 'PAYED',
            buyerEmail: `${token}-a@example.com`,
            originalBalanceCents: 10_000,
            balanceCents: 10_000,
        });
        await insertGiftCard(requestingSession.sessionId, {
            occasion: token,
            paymentStatus: 'PAYED',
            buyerEmail: `${token}-b@example.com`,
            originalBalanceCents: 20_000,
            balanceCents: 20_000,
        });
        await insertGiftCard(requestingSession.sessionId, {
            occasion: token,
            paymentStatus: 'PREPARED',
            buyerEmail: `${token}-prepared@example.com`,
            originalBalanceCents: 99_000,
            balanceCents: 99_000,
        });

        // Act
        const average = await adminGiftCardPaidPurchaseAverageCentsFindOne(requestingSession, serverRuntime);

        // Assert
        const expected = Math.round((before.totalCents + 30_000) / (before.paidCount + 2));
        expect(average).toBe(expected);
    });
});
