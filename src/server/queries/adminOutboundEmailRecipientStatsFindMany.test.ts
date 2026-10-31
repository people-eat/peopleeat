import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { outboundEmails } from '../db/schema';
import type { OutboundEmailCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminOutboundEmailRecipientStatsFindMany } from './adminOutboundEmailRecipientStatsFindMany';

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

describe('adminOutboundEmailRecipientStatsFindMany', () => {
    it('ranks recipients by send count and surfaces an attributed user when present', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: `To-${idCreate().slice(0, 6)}`,
        });
        const token = `to-${idCreate().slice(0, 8)}`;
        const topEmail = `${token}-top@example.com`;
        const otherEmail = `${token}-other@example.com`;
        // Base-36 over the nanoId alphabet (not hex-only): hex filtering can yield '' → NaN → Invalid Date.
        const dayOffset = Number.parseInt(idCreate().slice(0, 8), 36) % 300;
        const createdAt = new Date(Date.UTC(2099, 0, 1 + dayOffset, 12, 0, 0));
        const range = {
            startDateTime: new Date(Date.UTC(2099, 0, 1 + dayOffset, 0, 0, 0)),
            endDateTime: new Date(Date.UTC(2099, 0, 1 + dayOffset, 23, 59, 59, 999)),
        };

        for (let index = 0; index < 3; index += 1) {
            await insertOutboundEmail({
                toEmail: topEmail,
                userId: user.userId,
                subject: `${token}-top-${index}`,
                createdAt,
            });
        }
        await insertOutboundEmail({ toEmail: otherEmail, subject: `${token}-other`, createdAt });

        // Act
        const rows = await adminOutboundEmailRecipientStatsFindMany({ take: 5, range }, requestingSession, serverRuntime);

        // Assert
        expect(rows[0]?.toEmail).toBe(topEmail);
        expect(rows[0]?.count).toBe(3);
        expect(rows[0]?.userId).toBe(user.userId);
        expect(rows[0]?.displayName).toBe(user.firstName);
        expect(rows[1]?.toEmail).toBe(otherEmail);
        expect(rows[1]?.count).toBe(1);
        expect(rows[1]?.userId).toBeNull();
    });
});
