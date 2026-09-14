import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { outboundEmails } from '../db/schema';
import type { OutboundEmailCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminOutboundEmailCounts } from './adminOutboundEmailCounts';

const ALL_PURPOSES = ['AUTH_EMAIL_OTP', 'GIFT_CARD_PURCHASED', 'EMAIL_ADDRESS_UPDATE_CONFIRM'] as const;

async function insertOutboundEmail(overrides: Partial<OutboundEmailCreate> = {}) {
    await testDb.insert(outboundEmails).values({
        outboundEmailId: overrides.outboundEmailId ?? idCreate(),
        provider: 'resend',
        purpose: 'AUTH_EMAIL_OTP',
        toEmail: 'guest@example.com',
        subject: 'Your code',
        locale: 'en',
        ...overrides,
    });
}

describe('adminOutboundEmailCounts', () => {
    it('returns one count per criterion in order', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `facet-${idCreate().slice(0, 8)}`;
        await insertOutboundEmail({ subject: `${token}-otp`, purpose: 'AUTH_EMAIL_OTP' });
        await insertOutboundEmail({ subject: `${token}-gift`, purpose: 'GIFT_CARD_PURCHASED' });

        // Act
        const [total, otp, gift] = await adminOutboundEmailCounts(
            {
                criteria: [
                    { searchText: token, purposes: [...ALL_PURPOSES] },
                    { searchText: token, purposes: ['AUTH_EMAIL_OTP'] },
                    { searchText: token, purposes: ['GIFT_CARD_PURCHASED'] },
                ],
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(total).toBe(2);
        expect(otp).toBe(1);
        expect(gift).toBe(1);
    });

    it('counts rows matching searchText and purposes', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `count-${idCreate().slice(0, 8)}`;
        await insertOutboundEmail({ subject: `${token}-a`, purpose: 'AUTH_EMAIL_OTP' });
        await insertOutboundEmail({ subject: `${token}-b`, purpose: 'AUTH_EMAIL_OTP' });
        await insertOutboundEmail({ subject: `${token}-c`, purpose: 'GIFT_CARD_PURCHASED' });
        await insertOutboundEmail({ subject: 'unrelated', purpose: 'AUTH_EMAIL_OTP' });

        // Act
        const [total] = await adminOutboundEmailCounts(
            { criteria: [{ searchText: token, purposes: ['AUTH_EMAIL_OTP'] }] },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(total).toBe(2);
    });

    it('returns 0 when purposes is empty', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act
        const [total] = await adminOutboundEmailCounts({ criteria: [{ purposes: [] }] }, requestingSession, serverRuntime);

        // Assert
        expect(total).toBe(0);
    });

    it('rejects an empty criteria list', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act / Assert
        await expect(adminOutboundEmailCounts({ criteria: [] }, requestingSession, serverRuntime)).rejects.toThrow(
            /criteria must not be empty/,
        );
    });
});
