import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { giftCards } from '../db/schema';
import type { GiftCardPaymentStatus } from '../domain/giftCard';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminGiftCardOccasionStatsFindMany } from './adminGiftCardOccasionStatsFindMany';

function isolatedRange() {
    const year = 5000 + Math.floor(Math.random() * 4000);
    return {
        range: {
            startDateTime: new Date(Date.UTC(year, 3, 1)),
            endDateTime: new Date(Date.UTC(year, 3, 20)),
        },
        inside: new Date(Date.UTC(year, 3, 10, 12)),
        outside: new Date(Date.UTC(year, 5, 10, 12)),
    };
}

async function insertGiftCard(
    sessionId: string,
    occasion: string,
    createdAt: Date,
    originalBalanceCents: number,
    paymentStatus: GiftCardPaymentStatus,
) {
    const giftCardId = idCreate();
    await testDb.insert(giftCards).values({
        giftCardId,
        sessionId,
        buyerEmail: `${giftCardId}@example.com`,
        locale: 'en',
        occasion,
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

describe('adminGiftCardOccasionStatsFindMany', () => {
    it('ranks paid occasions by purchase count and sums original balance', async () => {
        // Arrange
        const buyer = await commandSetup();
        const window = isolatedRange();
        const sessionId = buyer.requestingSession.sessionId;
        const token = idCreate();
        const popular = `popular-${token}`;
        const rare = `rare-${token}`;
        await insertGiftCard(sessionId, popular, window.inside, 1000, 'PAYED');
        await insertGiftCard(sessionId, popular, window.inside, 2000, 'PAYED');
        await insertGiftCard(sessionId, popular, window.inside, 9000, 'PREPARED');
        await insertGiftCard(sessionId, rare, window.inside, 100, 'PAYED');
        await insertGiftCard(sessionId, popular, window.outside, 5000, 'PAYED');

        // Act
        const stats = await adminGiftCardOccasionStatsFindMany(
            { range: window.range, take: 10 },
            buyer.requestingSession,
            buyer.serverRuntime,
        );

        // Assert
        expect(stats).toEqual([
            { occasion: popular, count: 2, totalOriginalBalanceCents: 3000 },
            { occasion: rare, count: 1, totalOriginalBalanceCents: 100 },
        ]);
    });

    it('breaks count ties by occasion ascending', async () => {
        // Arrange
        const buyer = await commandSetup();
        const window = isolatedRange();
        const token = idCreate();
        const first = `a-${token}`;
        const second = `z-${token}`;
        await insertGiftCard(buyer.requestingSession.sessionId, second, window.inside, 100, 'PAYED');
        await insertGiftCard(buyer.requestingSession.sessionId, first, window.inside, 100, 'PAYED');

        // Act
        const stats = await adminGiftCardOccasionStatsFindMany(
            { range: window.range, take: 10 },
            buyer.requestingSession,
            buyer.serverRuntime,
        );

        // Assert
        expect(stats.map((stat) => stat.occasion)).toEqual([first, second]);
    });

    it('limits the result to take', async () => {
        // Arrange
        const buyer = await commandSetup();
        const window = isolatedRange();
        const token = idCreate();
        const popular = `popular-${token}`;
        await insertGiftCard(buyer.requestingSession.sessionId, popular, window.inside, 100, 'PAYED');
        await insertGiftCard(buyer.requestingSession.sessionId, popular, window.inside, 100, 'PAYED');
        await insertGiftCard(buyer.requestingSession.sessionId, `rare-${token}`, window.inside, 100, 'PAYED');

        // Act
        const stats = await adminGiftCardOccasionStatsFindMany(
            { range: window.range, take: 1 },
            buyer.requestingSession,
            buyer.serverRuntime,
        );

        // Assert
        expect(stats).toEqual([{ occasion: popular, count: 2, totalOriginalBalanceCents: 200 }]);
    });

    it('returns an empty list when the range has no paid cards', async () => {
        // Arrange
        const setup = await commandSetup();
        const year = 5000 + Math.floor(Math.random() * 4000);

        // Act
        const stats = await adminGiftCardOccasionStatsFindMany(
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
