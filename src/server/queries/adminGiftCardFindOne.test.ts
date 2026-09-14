import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { giftCards } from '../db/schema';
import type { GiftCard, GiftCardCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminGiftCardFindOne } from './adminGiftCardFindOne';

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

describe('adminGiftCardFindOne', () => {
    it('returns the mapped gift card row', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const row = await insertGiftCard(requestingSession.sessionId, {
            buyerEmail: 'findone-buyer@example.com',
            occasion: 'Anniversary',
        });

        // Act
        const result = await adminGiftCardFindOne({ giftCardId: row.giftCardId }, requestingSession, serverRuntime);

        // Assert
        expect(result).toMatchObject({
            giftCardId: row.giftCardId,
            buyerEmail: 'findone-buyer@example.com',
            occasion: 'Anniversary',
            paymentStatus: 'PAYED',
            originalBalanceCents: 5000,
        });
    });

    it('returns null when the gift card id is unknown', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act / Assert
        await expect(adminGiftCardFindOne({ giftCardId: idCreate() }, requestingSession, serverRuntime)).resolves.toBeNull();
    });
});
