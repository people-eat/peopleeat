import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { giftCards } from '../db/schema';
import type { GiftCardCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminGiftCardCounts } from './adminGiftCardCounts';

const ALL_STATUSES = ['PREPARED', 'PAYED'] as const;

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

describe('adminGiftCardCounts', () => {
    it('returns one count per criterion in order', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `facet-${idCreate().slice(0, 8)}`;
        await insertGiftCard(requestingSession.sessionId, {
            occasion: token,
            paymentStatus: 'PAYED',
            buyerEmail: `${token}-payed@example.com`,
        });
        await insertGiftCard(requestingSession.sessionId, {
            occasion: token,
            paymentStatus: 'PREPARED',
            buyerEmail: `${token}-prepared@example.com`,
        });

        // Act
        const [total, payed, prepared] = await adminGiftCardCounts(
            {
                criteria: [
                    { searchText: token, paymentStatuses: [...ALL_STATUSES] },
                    { searchText: token, paymentStatuses: ['PAYED'] },
                    { searchText: token, paymentStatuses: ['PREPARED'] },
                ],
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(total).toBe(2);
        expect(payed).toBe(1);
        expect(prepared).toBe(1);
    });

    it('counts rows matching searchText and paymentStatuses', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `count-${idCreate().slice(0, 8)}`;
        await insertGiftCard(requestingSession.sessionId, {
            occasion: token,
            paymentStatus: 'PAYED',
            buyerEmail: `${token}-a@example.com`,
        });
        await insertGiftCard(requestingSession.sessionId, {
            occasion: token,
            paymentStatus: 'PAYED',
            buyerEmail: `${token}-b@example.com`,
        });
        await insertGiftCard(requestingSession.sessionId, {
            occasion: token,
            paymentStatus: 'PREPARED',
            buyerEmail: `${token}-c@example.com`,
        });
        await insertGiftCard(requestingSession.sessionId, {
            occasion: 'unrelated',
            paymentStatus: 'PAYED',
            buyerEmail: 'other@example.com',
        });

        // Act
        const [total] = await adminGiftCardCounts(
            { criteria: [{ searchText: token, paymentStatuses: ['PAYED'] }] },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(total).toBe(2);
    });

    it('returns 0 when paymentStatuses is empty', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act
        const [total] = await adminGiftCardCounts({ criteria: [{ paymentStatuses: [] }] }, requestingSession, serverRuntime);

        // Assert
        expect(total).toBe(0);
    });

    it('rejects an empty criteria list', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act / Assert
        await expect(adminGiftCardCounts({ criteria: [] }, requestingSession, serverRuntime)).rejects.toThrow(/criteria must not be empty/);
    });
});
