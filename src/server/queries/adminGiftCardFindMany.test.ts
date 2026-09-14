import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { giftCards } from '../db/schema';
import type { GiftCard, GiftCardCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminGiftCardFindMany } from './adminGiftCardFindMany';

const ALL_STATUSES = ['PREPARED', 'PAYED'] as const;

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

describe('adminGiftCardFindMany', () => {
    it('returns seeded gift cards ordered by createdAt descending', async () => {
        // Arrange
        const older = await commandSetup.withUser();
        const newer = await commandSetup.withUser();
        const token = `order-${idCreate().slice(0, 8)}`;
        const olderRow = await insertGiftCard(older.requestingSession.sessionId, {
            buyerEmail: `${token}-older@example.com`,
            occasion: token,
        });
        const newerRow = await insertGiftCard(newer.requestingSession.sessionId, {
            buyerEmail: `${token}-newer@example.com`,
            occasion: token,
        });

        // Act
        const rows = await adminGiftCardFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, paymentStatuses: [...ALL_STATUSES] } },
            older.requestingSession,
            older.serverRuntime,
        );

        // Assert
        const olderIdx = rows.findIndex((row) => row.giftCardId === olderRow.giftCardId);
        const newerIdx = rows.findIndex((row) => row.giftCardId === newerRow.giftCardId);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
    });

    it('filters by searchText against buyer email and occasion', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `search-${idCreate().slice(0, 8)}`;
        const match = await insertGiftCard(requestingSession.sessionId, {
            buyerEmail: `${token}@example.com`,
            occasion: 'Birthday',
        });
        const miss = await insertGiftCard(requestingSession.sessionId, {
            buyerEmail: 'unrelated@example.com',
            occasion: 'Other',
        });

        // Act
        const rows = await adminGiftCardFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, paymentStatuses: [...ALL_STATUSES] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.some((row) => row.giftCardId === match.giftCardId)).toBe(true);
        expect(rows.some((row) => row.giftCardId === miss.giftCardId)).toBe(false);
    });

    it('paginates with skip and take', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `page-${idCreate().slice(0, 8)}`;
        await insertGiftCard(requestingSession.sessionId, { occasion: token, buyerEmail: `${token}-a@example.com` });
        await insertGiftCard(requestingSession.sessionId, { occasion: token, buyerEmail: `${token}-b@example.com` });
        await insertGiftCard(requestingSession.sessionId, { occasion: token, buyerEmail: `${token}-c@example.com` });

        // Act
        const page = await adminGiftCardFindMany(
            { criterion: { skip: 0, take: 2, searchText: token, paymentStatuses: [...ALL_STATUSES] } },
            requestingSession,
            serverRuntime,
        );
        const next = await adminGiftCardFindMany(
            { criterion: { skip: 2, take: 2, searchText: token, paymentStatuses: [...ALL_STATUSES] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(page).toHaveLength(2);
        expect(next).toHaveLength(1);
        expect(new Set([...page, ...next].map((row) => row.giftCardId)).size).toBe(3);
    });

    it('returns no rows when paymentStatuses is empty', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act
        const rows = await adminGiftCardFindMany(
            { criterion: { skip: 0, take: 100, paymentStatuses: [] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows).toEqual([]);
    });

    it('filters by paymentStatus membership', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `status-${idCreate().slice(0, 8)}`;
        const payed = await insertGiftCard(requestingSession.sessionId, {
            occasion: token,
            paymentStatus: 'PAYED',
            buyerEmail: `${token}-payed@example.com`,
        });
        const prepared = await insertGiftCard(requestingSession.sessionId, {
            occasion: token,
            paymentStatus: 'PREPARED',
            buyerEmail: `${token}-prepared@example.com`,
        });

        // Act
        const payedOnly = await adminGiftCardFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, paymentStatuses: ['PAYED'] } },
            requestingSession,
            serverRuntime,
        );
        const preparedOnly = await adminGiftCardFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, paymentStatuses: ['PREPARED'] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(payedOnly.map((row) => row.giftCardId)).toEqual([payed.giftCardId]);
        expect(preparedOnly.map((row) => row.giftCardId)).toEqual([prepared.giftCardId]);
    });
});
