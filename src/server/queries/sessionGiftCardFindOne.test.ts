import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { giftCards } from '../db/schema';
import type { GiftCard, GiftCardCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionGiftCardFindOne } from './sessionGiftCardFindOne';

async function insertGiftCard(sessionId: string, overrides: Partial<GiftCardCreate> = {}): Promise<GiftCard> {
    const giftCardId = overrides.giftCardId ?? idCreate();
    const [row] = await testDb
        .insert(giftCards)
        .values({
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
        })
        .returning();
    if (!row) throw new Error('insertGiftCard: no row');
    return row;
}

describe('sessionGiftCardFindOne', () => {
    it('returns the latest gift card for the session', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        await insertGiftCard(requestingSession.sessionId, { createdAt: new Date(Date.now() - 60_000) });
        const latest = await insertGiftCard(requestingSession.sessionId, { createdAt: new Date() });

        // Act
        const result = await sessionGiftCardFindOne(requestingSession, serverRuntime);

        // Assert
        expect(result).toMatchObject({ giftCardId: latest.giftCardId });
    });

    it('returns null when the session has no gift card', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(sessionGiftCardFindOne(requestingSession, serverRuntime)).resolves.toBeNull();
    });
});
