import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { giftCards } from '../db/schema';
import type { GiftCardCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminGiftCardPaidPurchaseRangeCentsFindOne } from './adminGiftCardPaidPurchaseRangeCentsFindOne';

async function insertGiftCard(sessionId: string, overrides: Partial<GiftCardCreate> = {}): Promise<void> {
    const giftCardId = overrides.giftCardId ?? idCreate();
    await testDb.insert(giftCards).values({
        giftCardId,
        sessionId,
        buyerEmail: `${giftCardId}@example.com`,
        locale: 'en',
        occasion: 'Birthday',
        recipientName: 'Ada',
        message: '',
        originalBalanceCents: 2500,
        balanceCents: 2500,
        redeemCode: `GC-${giftCardId}`,
        paymentIntentId: `pi_${giftCardId}`,
        paymentClientSecret: `secret_${giftCardId}`,
        paymentStatus: 'PAYED',
        expiresAt: new Date(Date.now() + 86_400_000),
        ...overrides,
    });
}

describe('adminGiftCardPaidPurchaseRangeCentsFindOne', () => {
    it('sums paid originalBalanceCents by payedAt with createdAt fallback', async () => {
        const buyer = await commandSetup();
        const inRangePayedAt = new Date('2034-05-10T12:00:00.000Z');
        const inRangeCreatedAt = new Date('2034-05-11T12:00:00.000Z');
        const outOfRange = new Date('2034-07-01T12:00:00.000Z');

        await insertGiftCard(buyer.requestingSession.sessionId, {
            originalBalanceCents: 4000,
            createdAt: new Date('2034-01-01T12:00:00.000Z'),
            payedAt: inRangePayedAt,
        });
        await insertGiftCard(buyer.requestingSession.sessionId, {
            originalBalanceCents: 1500,
            createdAt: inRangeCreatedAt,
            payedAt: null,
        });
        await insertGiftCard(buyer.requestingSession.sessionId, {
            originalBalanceCents: 9000,
            createdAt: outOfRange,
            payedAt: outOfRange,
        });
        await insertGiftCard(buyer.requestingSession.sessionId, {
            originalBalanceCents: 8000,
            paymentStatus: 'PREPARED',
            createdAt: inRangeCreatedAt,
        });

        const total = await adminGiftCardPaidPurchaseRangeCentsFindOne(
            {
                range: {
                    startDateTime: new Date('2034-05-01T00:00:00.000Z'),
                    endDateTime: new Date('2034-05-31T23:59:59.999Z'),
                },
            },
            buyer.requestingSession,
            buyer.serverRuntime,
        );

        expect(total).toBeGreaterThanOrEqual(5500);
    });
});
