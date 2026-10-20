import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { outboundEmails } from '../db/schema';
import type { OutboundEmailCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminOutboundEmailPurposeStatsFindMany } from './adminOutboundEmailPurposeStatsFindMany';

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

describe('adminOutboundEmailPurposeStatsFindMany', () => {
    it('ranks purposes by send count within a range', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `purpose-${idCreate().slice(0, 8)}`;
        const dayOffset =
            Number.parseInt(
                idCreate()
                    .replace(/[^0-9a-f]/gi, '')
                    .slice(0, 4),
                16,
            ) % 300;
        const createdAt = new Date(Date.UTC(2098, 0, 1 + dayOffset, 12, 0, 0));
        const range = {
            startDateTime: new Date(Date.UTC(2098, 0, 1 + dayOffset, 0, 0, 0)),
            endDateTime: new Date(Date.UTC(2098, 0, 1 + dayOffset, 23, 59, 59, 999)),
        };

        for (let index = 0; index < 3; index += 1) {
            await insertOutboundEmail({
                purpose: 'GIFT_CARD_PURCHASED',
                toEmail: `${token}-gift-${index}@example.com`,
                subject: `${token}-gift-${index}`,
                createdAt,
            });
        }
        await insertOutboundEmail({
            purpose: 'EMAIL_ADDRESS_UPDATE_CONFIRM',
            toEmail: `${token}-update@example.com`,
            subject: `${token}-update`,
            createdAt,
        });

        // Act
        const rows = await adminOutboundEmailPurposeStatsFindMany({ take: 5, range }, requestingSession, serverRuntime);

        // Assert
        expect(rows[0]?.purpose).toBe('GIFT_CARD_PURCHASED');
        expect(rows[0]?.count).toBe(3);
        expect(rows[1]?.purpose).toBe('EMAIL_ADDRESS_UPDATE_CONFIRM');
        expect(rows[1]?.count).toBe(1);
    });
});
