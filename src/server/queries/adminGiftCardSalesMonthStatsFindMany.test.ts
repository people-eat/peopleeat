import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { giftCards } from '../db/schema';
import type { GiftCardPaymentStatus } from '../domain/giftCard';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminGiftCardSalesMonthStatsFindMany } from './adminGiftCardSalesMonthStatsFindMany';

function yearWindow() {
    const year = 5000 + Math.floor(Math.random() * 4000);
    return {
        range: {
            startDateTime: new Date(Date.UTC(year, 3, 1)),
            endDateTime: new Date(Date.UTC(year, 8, 30)),
        },
        april: new Date(Date.UTC(year, 3, 15, 12)),
        september: new Date(Date.UTC(year, 8, 15, 12)),
        january: new Date(Date.UTC(year, 0, 15, 12)),
    };
}

async function insertGiftCard(sessionId: string, createdAt: Date, originalBalanceCents: number, paymentStatus: GiftCardPaymentStatus) {
    const giftCardId = idCreate();
    await testDb.insert(giftCards).values({
        giftCardId,
        sessionId,
        buyerEmail: `${giftCardId}@example.com`,
        locale: 'en',
        occasion: 'Birthday',
        recipientName: 'Ada',
        message: '',
        originalBalanceCents,
        balanceCents: originalBalanceCents,
        redeemCode: `GC-${giftCardId}`,
        paymentIntentId: `pi_${giftCardId}`,
        paymentClientSecret: `secret_${giftCardId}`,
        paymentStatus,
        expiresAt: new Date(createdAt.getTime() + 86_400_000),
        createdAt,
    });
}

describe('adminGiftCardSalesMonthStatsFindMany', () => {
    it('ranks paid months by purchase count and sums original balance', async () => {
        // Arrange
        const buyer = await commandSetup();
        const window = yearWindow();
        const sessionId = buyer.requestingSession.sessionId;
        await insertGiftCard(sessionId, window.april, 1000, 'PAYED');
        await insertGiftCard(sessionId, window.april, 2500, 'PAYED');
        await insertGiftCard(sessionId, window.april, 9999, 'PREPARED');
        await insertGiftCard(sessionId, window.september, 400, 'PAYED');
        await insertGiftCard(sessionId, window.january, 50, 'PAYED');

        // Act
        const stats = await adminGiftCardSalesMonthStatsFindMany(
            { range: window.range, take: 10 },
            buyer.requestingSession,
            buyer.serverRuntime,
        );

        // Assert
        expect(stats).toHaveLength(2);
        expect(stats[0]).toMatchObject({ count: 2, totalOriginalBalanceCents: 3500 });
        expect(stats[1]).toMatchObject({ count: 1, totalOriginalBalanceCents: 400 });
        expect(stats[0]!.monthStart.getTime()).toBeLessThan(stats[1]!.monthStart.getTime());
    });

    it('limits the result to take', async () => {
        // Arrange
        const buyer = await commandSetup();
        const window = yearWindow();
        const sessionId = buyer.requestingSession.sessionId;
        await insertGiftCard(sessionId, window.april, 1000, 'PAYED');
        await insertGiftCard(sessionId, window.april, 1000, 'PAYED');
        await insertGiftCard(sessionId, window.september, 1000, 'PAYED');

        // Act
        const stats = await adminGiftCardSalesMonthStatsFindMany(
            { range: window.range, take: 1 },
            buyer.requestingSession,
            buyer.serverRuntime,
        );

        // Assert
        expect(stats).toHaveLength(1);
        expect(stats[0]?.count).toBe(2);
    });

    it('returns an empty list when the range has no paid cards', async () => {
        // Arrange
        const setup = await commandSetup();
        const year = 5000 + Math.floor(Math.random() * 4000);

        // Act
        const stats = await adminGiftCardSalesMonthStatsFindMany(
            {
                range: {
                    startDateTime: new Date(Date.UTC(year, 1, 1)),
                    endDateTime: new Date(Date.UTC(year, 1, 2)),
                },
                take: 10,
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(stats).toEqual([]);
    });
});
