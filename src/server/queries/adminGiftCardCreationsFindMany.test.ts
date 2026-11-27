import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { giftCards } from '../db/schema';
import type { GiftCardPaymentStatus } from '../domain/giftCard';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminGiftCardCreationsFindMany } from './adminGiftCardCreationsFindMany';

function isolatedDays() {
    const year = 5000 + Math.floor(Math.random() * 4000);
    const day = 5 + Math.floor(Math.random() * 15);
    return {
        startDateTime: new Date(Date.UTC(year, 6, day)),
        endDateTime: new Date(Date.UTC(year, 6, day + 2)),
        createdAt: new Date(Date.UTC(year, 6, day + 1, 12)),
    };
}

async function insertGiftCard(sessionId: string, createdAt: Date, paymentStatus: GiftCardPaymentStatus) {
    const giftCardId = idCreate();
    await testDb.insert(giftCards).values({
        giftCardId,
        sessionId,
        buyerEmail: `${giftCardId}@example.com`,
        locale: 'en',
        occasion: 'Birthday',
        recipientName: 'Ada',
        message: '',
        originalBalanceCents: 1000,
        balanceCents: 1000,
        redeemCode: `GC-${giftCardId}`,
        paymentIntentId: `pi_${giftCardId}`,
        paymentClientSecret: `secret_${giftCardId}`,
        paymentStatus,
        expiresAt: new Date(createdAt.getTime() + 86_400_000),
        createdAt,
    });
}

describe('adminGiftCardCreationsFindMany', () => {
    it('counts paid cards in an ascending zero-filled day series and ignores prepared cards', async () => {
        // Arrange
        const buyer = await commandSetup();
        const window = isolatedDays();
        await insertGiftCard(buyer.requestingSession.sessionId, window.createdAt, 'PAYED');
        await insertGiftCard(buyer.requestingSession.sessionId, window.createdAt, 'PREPARED');

        // Act
        const series = await adminGiftCardCreationsFindMany(
            { range: { startDateTime: window.startDateTime, endDateTime: window.endDateTime }, granularity: 'day' },
            buyer.requestingSession,
            buyer.serverRuntime,
        );

        // Assert
        expect(series).toHaveLength(3);
        for (let index = 1; index < series.length; index += 1) {
            expect(series[index]!.bucketStart.getTime()).toBeGreaterThan(series[index - 1]!.bucketStart.getTime());
        }
        const hits = series.filter((bucket) => {
            const start = bucket.bucketStart.getTime();
            return window.createdAt.getTime() >= start && window.createdAt.getTime() < start + 86_400_000;
        });
        expect(hits).toHaveLength(1);
        expect(hits[0]!.count).toBe(1);
        expect(series.filter((bucket) => bucket !== hits[0]).every((bucket) => bucket.count === 0)).toBe(true);
    });

    it('buckets paid cards by payedAt when createdAt is outside the range', async () => {
        const buyer = await commandSetup();
        const window = isolatedDays();
        const giftCardId = idCreate();
        await testDb.insert(giftCards).values({
            giftCardId,
            sessionId: buyer.requestingSession.sessionId,
            buyerEmail: `${giftCardId}@example.com`,
            locale: 'en',
            occasion: 'Birthday',
            recipientName: 'Ada',
            message: '',
            originalBalanceCents: 1000,
            balanceCents: 1000,
            redeemCode: `GC-${giftCardId}`,
            paymentIntentId: `pi_${giftCardId}`,
            paymentClientSecret: `secret_${giftCardId}`,
            paymentStatus: 'PAYED',
            expiresAt: new Date(window.createdAt.getTime() + 86_400_000),
            createdAt: new Date(window.startDateTime.getTime() - 10 * 86_400_000),
            payedAt: window.createdAt,
        });

        const series = await adminGiftCardCreationsFindMany(
            { range: { startDateTime: window.startDateTime, endDateTime: window.endDateTime }, granularity: 'day' },
            buyer.requestingSession,
            buyer.serverRuntime,
        );

        const hits = series.filter((bucket) => {
            const start = bucket.bucketStart.getTime();
            return window.createdAt.getTime() >= start && window.createdAt.getTime() < start + 86_400_000;
        });
        expect(hits).toHaveLength(1);
        expect(hits[0]!.count).toBe(1);
    });
});
