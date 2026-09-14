import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { outboundEmails } from '../db/schema';
import type { OutboundEmailCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { outboundEmailsUserIdBackfillByToEmail } from './outboundEmailsUserIdBackfillByToEmail';

async function insertOutboundEmail(overrides: Partial<OutboundEmailCreate> = {}) {
    const outboundEmailId = overrides.outboundEmailId ?? idCreate();
    const [row] = await testDb
        .insert(outboundEmails)
        .values({
            outboundEmailId,
            provider: 'console',
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

describe('outboundEmailsUserIdBackfillByToEmail', () => {
    it('stamps userId on null-attribution rows matching toEmail', async () => {
        const { user } = await commandSetup.withUser();
        const email = `backfill-${idCreate().toLowerCase()}@example.com`;
        const match = await insertOutboundEmail({ toEmail: email, userId: null, purpose: 'AUTH_EMAIL_OTP' });
        const gift = await insertOutboundEmail({ toEmail: email, userId: null, purpose: 'GIFT_CARD_PURCHASED' });

        await outboundEmailsUserIdBackfillByToEmail(testDb, { toEmail: email, userId: user.userId });

        const [matchRow] = await testDb.select().from(outboundEmails).where(eq(outboundEmails.outboundEmailId, match.outboundEmailId));
        const [giftRow] = await testDb.select().from(outboundEmails).where(eq(outboundEmails.outboundEmailId, gift.outboundEmailId));
        expect(matchRow?.userId).toBe(user.userId);
        expect(giftRow?.userId).toBe(user.userId);
    });

    it('leaves unrelated emails and already-attributed rows unchanged', async () => {
        const { user } = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const email = `backfill-guard-${idCreate().toLowerCase()}@example.com`;
        const unrelated = await insertOutboundEmail({
            toEmail: `other-${idCreate().toLowerCase()}@example.com`,
            userId: null,
        });
        const alreadyAttributed = await insertOutboundEmail({
            toEmail: email,
            userId: other.user.userId,
        });

        await outboundEmailsUserIdBackfillByToEmail(testDb, { toEmail: email, userId: user.userId });

        const [unrelatedRow] = await testDb
            .select()
            .from(outboundEmails)
            .where(eq(outboundEmails.outboundEmailId, unrelated.outboundEmailId));
        const [attributedRow] = await testDb
            .select()
            .from(outboundEmails)
            .where(eq(outboundEmails.outboundEmailId, alreadyAttributed.outboundEmailId));
        expect(unrelatedRow?.userId).toBeNull();
        expect(attributedRow?.userId).toBe(other.user.userId);
    });
});
