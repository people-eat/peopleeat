import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { outboundEmails } from '../db/schema';
import type { OutboundEmailCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminOutboundEmailFindOne } from './adminOutboundEmailFindOne';

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

describe('adminOutboundEmailFindOne', () => {
    it('returns the mapped outbound email row', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const row = await insertOutboundEmail({
            toEmail: 'findone@example.com',
            subject: 'Find one subject',
            purpose: 'GIFT_CARD_PURCHASED',
        });

        // Act
        const result = await adminOutboundEmailFindOne({ outboundEmailId: row.outboundEmailId }, requestingSession, serverRuntime);

        // Assert
        expect(result).toMatchObject({
            outboundEmailId: row.outboundEmailId,
            toEmail: 'findone@example.com',
            subject: 'Find one subject',
            purpose: 'GIFT_CARD_PURCHASED',
        });
    });

    it('returns null when the outbound email id is unknown', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act / Assert
        await expect(adminOutboundEmailFindOne({ outboundEmailId: idCreate() }, requestingSession, serverRuntime)).resolves.toBeNull();
    });
});
