import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { outboundEmails } from '../db/schema';
import type { OutboundEmailCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminOutboundEmailFindMany } from './adminOutboundEmailFindMany';

const ALL_PURPOSES = ['AUTH_EMAIL_OTP', 'GIFT_CARD_PURCHASED', 'EMAIL_ADDRESS_UPDATE_CONFIRM'] as const;

async function insertOutboundEmail(overrides: Partial<OutboundEmailCreate> = {}) {
    const outboundEmailId = overrides.outboundEmailId ?? idCreate();
    const [row] = await testDb
        .insert(outboundEmails)
        .values({
            outboundEmailId,
            provider: 'resend',
            purpose: 'AUTH_EMAIL_OTP',
            toEmail: 'guest@example.com',
            subject: 'Your code',
            locale: 'en',
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertOutboundEmail: no row');
    return row;
}

describe('adminOutboundEmailFindMany', () => {
    it('returns seeded outbound emails ordered by createdAt descending', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `order-${idCreate().slice(0, 8)}`;
        const older = await insertOutboundEmail({ subject: `${token}-older`, toEmail: `${token}-older@example.com` });
        const newer = await insertOutboundEmail({ subject: `${token}-newer`, toEmail: `${token}-newer@example.com` });

        // Act
        const rows = await adminOutboundEmailFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, purposes: [...ALL_PURPOSES] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        const olderIdx = rows.findIndex((row) => row.outboundEmailId === older.outboundEmailId);
        const newerIdx = rows.findIndex((row) => row.outboundEmailId === newer.outboundEmailId);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
    });

    it('filters by searchText against toEmail and subject', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `search-${idCreate().slice(0, 8)}`;
        const match = await insertOutboundEmail({ subject: `${token}-match`, toEmail: 'other@example.com' });
        const miss = await insertOutboundEmail({ subject: 'nope', toEmail: 'miss@example.com' });

        // Act
        const rows = await adminOutboundEmailFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, purposes: [...ALL_PURPOSES] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.some((row) => row.outboundEmailId === match.outboundEmailId)).toBe(true);
        expect(rows.some((row) => row.outboundEmailId === miss.outboundEmailId)).toBe(false);
    });

    it('paginates with skip and take', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `page-${idCreate().slice(0, 8)}`;
        await insertOutboundEmail({ subject: `${token}-a` });
        await insertOutboundEmail({ subject: `${token}-b` });
        await insertOutboundEmail({ subject: `${token}-c` });

        // Act
        const page = await adminOutboundEmailFindMany(
            { criterion: { skip: 0, take: 2, searchText: token, purposes: [...ALL_PURPOSES] } },
            requestingSession,
            serverRuntime,
        );
        const next = await adminOutboundEmailFindMany(
            { criterion: { skip: 2, take: 2, searchText: token, purposes: [...ALL_PURPOSES] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(page).toHaveLength(2);
        expect(next).toHaveLength(1);
        expect(new Set([...page, ...next].map((row) => row.outboundEmailId)).size).toBe(3);
    });

    it('returns no rows when purposes is empty', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act
        const rows = await adminOutboundEmailFindMany(
            { criterion: { skip: 0, take: 100, purposes: [] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows).toEqual([]);
    });

    it('filters by purpose and userIds', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const token = `filter-${idCreate().slice(0, 8)}`;
        const otp = await insertOutboundEmail({
            subject: token,
            purpose: 'AUTH_EMAIL_OTP',
            userId: owner.user.userId,
        });
        const gift = await insertOutboundEmail({
            subject: token,
            purpose: 'GIFT_CARD_PURCHASED',
            userId: owner.user.userId,
        });
        const otherUser = await insertOutboundEmail({
            subject: token,
            purpose: 'AUTH_EMAIL_OTP',
            userId: other.user.userId,
        });

        // Act
        const otpOnly = await adminOutboundEmailFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, purposes: ['AUTH_EMAIL_OTP'] } },
            owner.requestingSession,
            owner.serverRuntime,
        );
        const byUser = await adminOutboundEmailFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    searchText: token,
                    purposes: [...ALL_PURPOSES],
                    userIds: [owner.user.userId],
                },
            },
            owner.requestingSession,
            owner.serverRuntime,
        );

        // Assert
        expect(otpOnly.map((row) => row.outboundEmailId).sort()).toEqual([otp.outboundEmailId, otherUser.outboundEmailId].sort());
        expect(byUser.map((row) => row.outboundEmailId).sort()).toEqual([otp.outboundEmailId, gift.outboundEmailId].sort());
        expect(byUser.some((row) => row.outboundEmailId === otherUser.outboundEmailId)).toBe(false);
    });
});
