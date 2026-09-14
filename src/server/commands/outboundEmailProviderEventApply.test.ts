import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { outboundEmails } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { outboundEmailProviderEventApply } from './outboundEmailProviderEventApply';

const LIFECYCLE_EVENTS = [
    { type: 'email.sent', column: 'sentAt' as const },
    { type: 'email.delivered', column: 'deliveredAt' as const },
    { type: 'email.delivery_delayed', column: 'deliveryDelayedAt' as const },
    { type: 'email.opened', column: 'openedAt' as const },
    { type: 'email.clicked', column: 'clickedAt' as const },
    { type: 'email.bounced', column: 'bouncedAt' as const },
    { type: 'email.complained', column: 'complainedAt' as const },
] as const;

async function seedOutboundEmail(providerMessageId: string) {
    const outboundEmailId = idCreate();
    await testDb.insert(outboundEmails).values({
        outboundEmailId,
        provider: 'resend',
        providerMessageId,
        purpose: 'AUTH_EMAIL_OTP',
        toEmail: 'guest@example.com',
        subject: 'Your code',
        locale: 'en',
    });
    return outboundEmailId;
}

describe('outboundEmailProviderEventApply', () => {
    it('returns applied:false for unknown event types without touching the row or publishing', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const providerMessageId = `msg-${idCreate()}`;
        const outboundEmailId = await seedOutboundEmail(providerMessageId);

        // Act
        const result = await outboundEmailProviderEventApply(
            {
                type: 'email.unknown_event',
                emailId: providerMessageId,
                createdAt: new Date('2026-01-02T00:00:00Z'),
            },
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ applied: false });
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const [row] = await testDb.select().from(outboundEmails).where(eq(outboundEmails.outboundEmailId, outboundEmailId));
        expect(row!.sentAt).toBeNull();
        expect(row!.deliveredAt).toBeNull();
    });

    it('returns applied:false and logs info when no outbound email matches the provider message id', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const missingId = `missing-${idCreate()}`;

        // Act
        const result = await outboundEmailProviderEventApply(
            {
                type: 'email.delivered',
                emailId: missingId,
                createdAt: new Date('2026-01-02T00:00:00Z'),
            },
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ applied: false });
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        // No session on this log path — assert via console spy that info was emitted.
        expect(console.info).toHaveBeenCalledWith(expect.stringContaining(`no matching outbound email for providerMessageId=${missingId}`));
    });

    for (const { type, column } of LIFECYCLE_EVENTS) {
        it(`applies ${type} once (first-write-wins) and publishes adminUpdates`, async () => {
            // Arrange
            const { serverRuntime } = await commandSetup();
            const providerMessageId = `msg-${idCreate()}`;
            const outboundEmailId = await seedOutboundEmail(providerMessageId);
            const firstAt = new Date('2026-01-02T10:00:00Z');
            const secondAt = new Date('2026-01-02T11:00:00Z');

            // Act — first apply
            const first = await outboundEmailProviderEventApply({ type, emailId: providerMessageId, createdAt: firstAt }, serverRuntime);
            // Act — duplicate / out-of-order retry
            const second = await outboundEmailProviderEventApply({ type, emailId: providerMessageId, createdAt: secondAt }, serverRuntime);

            // Assert
            expect(first).toEqual({ applied: true });
            expect(second).toEqual({ applied: false });
            expect(serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);

            const [row] = await testDb.select().from(outboundEmails).where(eq(outboundEmails.outboundEmailId, outboundEmailId));
            expect(row![column]?.toISOString()).toBe(firstAt.toISOString());
        });
    }

    it('applies email.failed with truncated failureReason and publishes adminUpdates', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const providerMessageId = `msg-${idCreate()}`;
        const outboundEmailId = await seedOutboundEmail(providerMessageId);
        const failedAt = new Date('2026-01-03T12:00:00Z');
        const longReason = 'x'.repeat(600);

        // Act
        const result = await outboundEmailProviderEventApply(
            {
                type: 'email.failed',
                emailId: providerMessageId,
                createdAt: failedAt,
                failureReason: longReason,
            },
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ applied: true });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalledOnce();
        const [row] = await testDb.select().from(outboundEmails).where(eq(outboundEmails.outboundEmailId, outboundEmailId));
        expect(row!.failedAt?.toISOString()).toBe(failedAt.toISOString());
        expect(row!.failureReason).toBe(longReason.slice(0, 500));
        expect(row!.failureReason).toHaveLength(500);
    });

    it('applies email.failed without failureReason when omitted', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const providerMessageId = `msg-${idCreate()}`;
        const outboundEmailId = await seedOutboundEmail(providerMessageId);
        const failedAt = new Date('2026-01-03T13:00:00Z');

        // Act
        const result = await outboundEmailProviderEventApply(
            {
                type: 'email.failed',
                emailId: providerMessageId,
                createdAt: failedAt,
            },
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ applied: true });
        const [row] = await testDb.select().from(outboundEmails).where(eq(outboundEmails.outboundEmailId, outboundEmailId));
        expect(row!.failedAt?.toISOString()).toBe(failedAt.toISOString());
        expect(row!.failureReason).toBeNull();
    });

    it('keeps the first failedAt / failureReason on a second email.failed event', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const providerMessageId = `msg-${idCreate()}`;
        const outboundEmailId = await seedOutboundEmail(providerMessageId);
        const firstAt = new Date('2026-01-03T14:00:00Z');
        const secondAt = new Date('2026-01-03T15:00:00Z');

        await outboundEmailProviderEventApply(
            {
                type: 'email.failed',
                emailId: providerMessageId,
                createdAt: firstAt,
                failureReason: 'first failure',
            },
            serverRuntime,
        );

        // Act
        const second = await outboundEmailProviderEventApply(
            {
                type: 'email.failed',
                emailId: providerMessageId,
                createdAt: secondAt,
                failureReason: 'second failure',
            },
            serverRuntime,
        );

        // Assert
        expect(second).toEqual({ applied: false });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
        const [row] = await testDb.select().from(outboundEmails).where(eq(outboundEmails.outboundEmailId, outboundEmailId));
        expect(row!.failedAt?.toISOString()).toBe(firstAt.toISOString());
        expect(row!.failureReason).toBe('first failure');
    });
});
