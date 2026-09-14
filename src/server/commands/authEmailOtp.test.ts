import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { authEmailOtps, sessions, users } from '../db/schema';
import { commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import * as authOtpUtils from '../utils/authOtpUtils';
import { authEmailOtpDelete } from './authEmailOtpDelete';
import { authEmailOtpRequest } from './authEmailOtpRequest';
import { authEmailOtpVerify } from './authEmailOtpVerify';

describe('authEmailOtp', () => {
    afterEach(() => {
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockRestore();
    });

    it('stores a hashed code, emails it, and publishes sessionUpdates', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('654321');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        const result = await authEmailOtpRequest({ email: 'Ada@Example.com', locale: 'en' }, requestingSession, serverRuntime);

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        expect(serverRuntime.email.send).toHaveBeenCalledOnce();
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({
            sessionId: requestingSession.sessionId,
        });

        const [row] = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(row?.emailAddress).toBe('ada@example.com');
        expect(row?.codeHash).toBe(authOtpUtils.authOtpCodeHash('654321', authOtpUtils.authOtpPepperRequire()));
        expect(row?.consumedAt).toBeNull();
    });

    it('passes the existing userId into the OTP email when the address is known', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            emailAddress: `known-${idCreate().toLowerCase()}@example.com`,
        });
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('121212');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        const email = user.emailAddress!;

        // Act
        await authEmailOtpRequest({ email, locale: 'de' }, requestingSession, serverRuntime);

        // Assert
        expect(serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: email,
                purpose: 'AUTH_EMAIL_OTP',
                locale: 'de',
                userId: user.userId,
            }),
        );
    });

    it('returns success without a new OTP when the cooldown is active', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const codeGenerate = vi.spyOn(authOtpUtils, 'authOtpCodeGenerate');
        codeGenerate.mockReturnValueOnce('111111');
        codeGenerate.mockReturnValueOnce('222222');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        const first = await authEmailOtpRequest({ email: 'cooldown@example.com', locale: 'en' }, requestingSession, serverRuntime);

        // Act — same email + session within 60s.
        const second = await authEmailOtpRequest({ email: 'cooldown@example.com', locale: 'en' }, requestingSession, serverRuntime);

        // Assert — cooldown short-circuits: no new row, no second email; republish so the client can open the dialog.
        expect(first.referenceId).toBeTruthy();
        expect(second).toEqual({ success: true, referenceId: first.referenceId });
        expect(serverRuntime.email.send).toHaveBeenCalledOnce();
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalledTimes(2);

        const rows = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(rows).toHaveLength(1);
        expect(rows[0]?.authEmailOtpId).toBe(first.referenceId);
        expect(codeGenerate).toHaveBeenCalledTimes(1);
    });

    it('sends the same OTP code again after the cooldown instead of minting a new one', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const codeGenerate = vi.spyOn(authOtpUtils, 'authOtpCodeGenerate');
        codeGenerate.mockReturnValueOnce('111111');
        codeGenerate.mockReturnValueOnce('222222');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        const first = await authEmailOtpRequest({ email: 'resend@example.com', locale: 'en' }, requestingSession, serverRuntime);
        await testDb
            .update(authEmailOtps)
            .set({ lastSentAt: new Date(Date.now() - 61_000) })
            .where(eq(authEmailOtps.authEmailOtpId, first.referenceId!));

        const second = await authEmailOtpRequest({ email: 'resend@example.com', locale: 'en' }, requestingSession, serverRuntime);

        expect(second).toEqual({ success: true, referenceId: first.referenceId });
        expect(serverRuntime.email.send).toHaveBeenCalledTimes(2);
        expect(codeGenerate).toHaveBeenCalledTimes(1);

        const sendCalls = vi.mocked(serverRuntime.email.send).mock.calls;
        expect(sendCalls[0]?.[0]).toEqual(expect.objectContaining({ subject: expect.stringContaining('111111') }));
        expect(sendCalls[1]?.[0]).toEqual(expect.objectContaining({ subject: expect.stringContaining('111111') }));

        const rows = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(rows).toHaveLength(1);
        expect(rows[0]?.codeHash).toBe(authOtpUtils.authOtpCodeHash('111111', authOtpUtils.authOtpPepperRequire()));
    });

    it('reuses a soft-dismissed OTP for the same email on retry', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const codeGenerate = vi.spyOn(authOtpUtils, 'authOtpCodeGenerate');
        codeGenerate.mockReturnValueOnce('333333');
        codeGenerate.mockReturnValueOnce('444444');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        const first = await authEmailOtpRequest({ email: 'dismiss-retry@example.com', locale: 'en' }, requestingSession, serverRuntime);
        await authEmailOtpDelete({ authEmailOtpId: first.referenceId! }, requestingSession, serverRuntime);

        const [dismissed] = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.authEmailOtpId, first.referenceId!));
        expect(dismissed?.dismissedAt).toBeInstanceOf(Date);

        await testDb
            .update(authEmailOtps)
            .set({ lastSentAt: new Date(Date.now() - 61_000) })
            .where(eq(authEmailOtps.authEmailOtpId, first.referenceId!));

        const second = await authEmailOtpRequest({ email: 'dismiss-retry@example.com', locale: 'en' }, requestingSession, serverRuntime);

        expect(second.referenceId).toBe(first.referenceId);
        expect(codeGenerate).toHaveBeenCalledTimes(1);
        expect(serverRuntime.email.send).toHaveBeenCalledTimes(2);

        const [restored] = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.authEmailOtpId, first.referenceId!));
        expect(restored?.dismissedAt).toBeNull();
    });

    it('allows a new OTP after the previous one was consumed within the cooldown window', async () => {
        // Covers: verify email → TOTP challenge → dismiss → request again within 60s.
        const { serverRuntime, requestingSession } = await commandSetup();
        const codeGenerate = vi.spyOn(authOtpUtils, 'authOtpCodeGenerate');
        codeGenerate.mockReturnValueOnce('111111');
        codeGenerate.mockReturnValueOnce('222222');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        const first = await authEmailOtpRequest({ email: 'after-totp@example.com', locale: 'en' }, requestingSession, serverRuntime);
        await testDb.update(authEmailOtps).set({ consumedAt: new Date() }).where(eq(authEmailOtps.authEmailOtpId, first.referenceId!));

        const second = await authEmailOtpRequest({ email: 'after-totp@example.com', locale: 'en' }, requestingSession, serverRuntime);

        expect(second.success).toBe(true);
        expect(second.referenceId).toBeTruthy();
        expect(second.referenceId).not.toBe(first.referenceId);
        expect(serverRuntime.email.send).toHaveBeenCalledTimes(2);
        expect(codeGenerate).toHaveBeenCalledTimes(2);

        const active = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(active).toHaveLength(2);
        const unconsumed = active.filter((row) => row.consumedAt == null);
        expect(unconsumed).toHaveLength(1);
        expect(unconsumed[0]?.authEmailOtpId).toBe(second.referenceId);
    });

    it('verifies a new email without creating a user and sets verifiedAt', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const email = `chef-${idCreate().toLowerCase()}@peopleeat.com`;
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('111222');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        await authEmailOtpRequest({ email, locale: 'de' }, requestingSession, serverRuntime);
        const result = await authEmailOtpVerify({ email, code: '111222' }, requestingSession, serverRuntime);

        expect(result.success).toBe(true);
        expect(requestingSession.userId).toBeNull();

        const matchingUsers = await testDb.select().from(users).where(eq(users.emailAddress, email));
        expect(matchingUsers).toHaveLength(0);

        const [row] = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(row?.verifiedAt).toBeInstanceOf(Date);
        expect(row?.consumedAt).toBeNull();
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalled();
    });

    it('binds an existing user instead of creating a duplicate', async () => {
        // Arrange
        const existing = await commandSetup.withUser({
            emailAddress: `existing-${idCreate().toLowerCase()}@example.com`,
            firstName: 'Existing',
            lastName: 'User',
        });
        const email = existing.user.emailAddress!;
        const { serverRuntime, requestingSession } = await commandSetup();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('333444');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        await authEmailOtpRequest({ email, locale: 'en' }, requestingSession, serverRuntime);

        // Act
        const result = await authEmailOtpVerify({ email, code: '333444' }, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ success: true, referenceId: existing.user.userId });
        expect(requestingSession.userId).toBe(existing.user.userId);
        const matchingUsers = await testDb.select().from(users).where(eq(users.emailAddress, email));
        expect(matchingUsers).toHaveLength(1);
    });

    it('binds an existing user when the stored email has mixed case', async () => {
        const nano = idCreate();
        const storedEmail = `Existing-${nano}@Example.COM`;
        const existing = await commandSetup.withUser({
            emailAddress: storedEmail,
            firstName: 'Existing',
            lastName: 'MixedCase',
        });
        const { serverRuntime, requestingSession } = await commandSetup();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('555666');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        await authEmailOtpRequest({ email: storedEmail, locale: 'en' }, requestingSession, serverRuntime);
        const result = await authEmailOtpVerify({ email: storedEmail, code: '555666' }, requestingSession, serverRuntime);

        expect(result).toEqual({ success: true, referenceId: existing.user.userId });
        expect(requestingSession.userId).toBe(existing.user.userId);
    });

    it('allows login when the matched user is BANNED', async () => {
        const banned = await commandSetup.withUser({
            emailAddress: `banned-${idCreate().toLowerCase()}@example.com`,
            status: 'BANNED',
        });
        const email = banned.user.emailAddress!;
        const { serverRuntime, requestingSession } = await commandSetup();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('777888');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        await authEmailOtpRequest({ email, locale: 'en' }, requestingSession, serverRuntime);

        const result = await authEmailOtpVerify({ email, code: '777888' }, requestingSession, serverRuntime);
        expect(result).toEqual({ success: true, referenceId: banned.user.userId });
        expect(requestingSession.userId).toBe(banned.user.userId);
    });

    it('rejects login when the matched user is ANONYMIZED', async () => {
        const anonymized = await commandSetup.withUser({
            emailAddress: `anon-${idCreate().toLowerCase()}@example.com`,
            status: 'ANONYMIZED',
        });
        const email = anonymized.user.emailAddress!;
        const { serverRuntime, requestingSession } = await commandSetup();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('777889');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        await authEmailOtpRequest({ email, locale: 'en' }, requestingSession, serverRuntime);

        await expect(authEmailOtpVerify({ email, code: '777889' }, requestingSession, serverRuntime)).rejects.toThrow(
            /authEmailOtpVerify: invalid or expired code/,
        );
        expect(requestingSession.userId).toBeNull();
    });

    it('rejects a second verify once the email is already verified', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const email = `verified-${idCreate().toLowerCase()}@example.com`;
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('121212');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });
        await authEmailOtpRequest({ email, locale: 'en' }, requestingSession, serverRuntime);
        await authEmailOtpVerify({ email, code: '121212' }, requestingSession, serverRuntime);

        await expect(authEmailOtpVerify({ email, code: '121212' }, requestingSession, serverRuntime)).rejects.toThrow(
            /authEmailOtpVerify: already verified/,
        );
    });

    it('rejects a wrong code, increments attemptCount, and does not bind', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('555666');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });
        await authEmailOtpRequest({ email: 'wrong@example.com', locale: 'en' }, requestingSession, serverRuntime);

        // Act + Assert
        await expect(authEmailOtpVerify({ email: 'wrong@example.com', code: '000000' }, requestingSession, serverRuntime)).rejects.toThrow(
            /authEmailOtpVerify: invalid or expired code/,
        );

        const [row, logRows, session] = await Promise.all([
            testDb
                .select()
                .from(authEmailOtps)
                .where(eq(authEmailOtps.sessionId, requestingSession.sessionId))
                .then((r) => r[0]),
            findLogsForSession(requestingSession.sessionId),
            testDb
                .select()
                .from(sessions)
                .where(eq(sessions.sessionId, requestingSession.sessionId))
                .then((r) => r[0]),
        ]);
        expect(row?.attemptCount).toBe(1);
        expect(row?.consumedAt).toBeNull();
        expect(session?.userId).toBeNull();
        expect(logRows.some((log) => log.level === 'error' && /invalid or expired code/.test(log.message))).toBe(true);
    });

    it('rejects an expired OTP without consuming it', async () => {
        // Arrange — seed an already-expired OTP row.
        const { serverRuntime, requestingSession } = await commandSetup();
        const pepper = authOtpUtils.authOtpPepperRequire();
        const authEmailOtpId = idCreate();
        await testDb.insert(authEmailOtps).values({
            authEmailOtpId,
            sessionId: requestingSession.sessionId,
            emailAddress: 'expired@example.com',
            codeHash: authOtpUtils.authOtpCodeHash('777888', pepper),
            codeEncrypted: authOtpUtils.authOtpCodeEncrypt('777888', pepper),
            expiresAt: new Date(Date.now() - 1_000),
            attemptCount: 0,
        });

        // Act + Assert
        await expect(
            authEmailOtpVerify({ email: 'expired@example.com', code: '777888' }, requestingSession, serverRuntime),
        ).rejects.toThrow(/authEmailOtpVerify: invalid or expired code/);

        const [row] = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.authEmailOtpId, authEmailOtpId));
        expect(row?.consumedAt).toBeNull();
        expect(row?.attemptCount).toBe(0);
        expect(requestingSession.userId).toBeNull();
    });

    it('rejects verification after the attempt limit is reached', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const pepper = authOtpUtils.authOtpPepperRequire();
        const authEmailOtpId = idCreate();
        await testDb.insert(authEmailOtps).values({
            authEmailOtpId,
            sessionId: requestingSession.sessionId,
            emailAddress: 'locked@example.com',
            codeHash: authOtpUtils.authOtpCodeHash('999000', pepper),
            codeEncrypted: authOtpUtils.authOtpCodeEncrypt('999000', pepper),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            attemptCount: 5,
        });

        // Act + Assert
        await expect(authEmailOtpVerify({ email: 'locked@example.com', code: '999000' }, requestingSession, serverRuntime)).rejects.toThrow(
            /authEmailOtpVerify: too many attemptCount/,
        );

        const [row, logRows] = await Promise.all([
            testDb
                .select()
                .from(authEmailOtps)
                .where(eq(authEmailOtps.authEmailOtpId, authEmailOtpId))
                .then((r) => r[0]),
            findLogsForSession(requestingSession.sessionId),
        ]);
        expect(row?.consumedAt).toBeNull();
        expect(row?.attemptCount).toBe(5);
        expect(logRows.some((log) => /too many attemptCount/.test(log.message))).toBe(true);
    });

    it('rejects a consumed OTP on a subsequent verify', async () => {
        // Arrange — consume via an existing-user verify first.
        const existing = await commandSetup.withUser({
            emailAddress: `consume-${idCreate().toLowerCase()}@example.com`,
        });
        const email = existing.user.emailAddress!;
        const { serverRuntime, requestingSession } = await commandSetup();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('101010');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });
        await authEmailOtpRequest({ email, locale: 'en' }, requestingSession, serverRuntime);
        await authEmailOtpVerify({ email, code: '101010' }, requestingSession, serverRuntime);
        const boundUserId = requestingSession.userId;

        // Act + Assert — session is bound; log-on verify is not for signed-in sessions.
        await expect(authEmailOtpVerify({ email, code: '101010' }, requestingSession, serverRuntime)).rejects.toThrow(
            /authEmailOtpVerify: already signed in/,
        );

        const [row] = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(row?.consumedAt).toBeInstanceOf(Date);
        expect(requestingSession.userId).toBe(boundUserId);
    });

    it('soft-dismisses an unverified session-owned OTP and publishes sessionUpdates', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('999888');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        const created = await authEmailOtpRequest({ email: 'delete-me@example.com', locale: 'en' }, requestingSession, serverRuntime);
        const result = await authEmailOtpDelete({ authEmailOtpId: created.referenceId! }, requestingSession, serverRuntime);

        expect(result.success).toBe(true);
        const rows = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(rows).toHaveLength(1);
        expect(rows[0]?.dismissedAt).toBeInstanceOf(Date);
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalled();
    });

    it('hard-deletes a verified registration ticket on discard', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('999887');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        const created = await authEmailOtpRequest(
            { email: 'verified-discard@example.com', locale: 'en' },
            requestingSession,
            serverRuntime,
        );
        await testDb.update(authEmailOtps).set({ verifiedAt: new Date() }).where(eq(authEmailOtps.authEmailOtpId, created.referenceId!));

        const result = await authEmailOtpDelete({ authEmailOtpId: created.referenceId! }, requestingSession, serverRuntime);

        expect(result.success).toBe(true);
        const rows = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(rows).toHaveLength(0);
    });

    it('refuses to delete an OTP owned by another session', async () => {
        // Arrange
        const owner = await commandSetup();
        const other = await commandSetup();
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue('888777');
        vi.mocked(owner.serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });
        const created = await authEmailOtpRequest(
            { email: 'other-session@example.com', locale: 'en' },
            owner.requestingSession,
            owner.serverRuntime,
        );

        // Act + Assert
        await expect(
            authEmailOtpDelete({ authEmailOtpId: created.referenceId! }, other.requestingSession, other.serverRuntime),
        ).rejects.toThrow(/authEmailOtpDelete: not found/);

        const rows = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.authEmailOtpId, created.referenceId!));
        expect(rows).toHaveLength(1);
        expect(other.serverRuntime.publish.sessionUpdates).not.toHaveBeenCalled();

        const logRows = await findLogsForSession(other.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/authEmailOtpDelete: not found/);
    });

    it('replaces a prior unconsumed OTP for the same session', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const codeGenerate = vi.spyOn(authOtpUtils, 'authOtpCodeGenerate');
        codeGenerate.mockReturnValueOnce('111111');
        codeGenerate.mockReturnValueOnce('222222');
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-test' });

        const first = await authEmailOtpRequest({ email: 'one@example.com', locale: 'en' }, requestingSession, serverRuntime);
        const second = await authEmailOtpRequest({ email: 'two@example.com', locale: 'en' }, requestingSession, serverRuntime);

        expect(first.referenceId).toBeTruthy();
        expect(second.referenceId).toBeTruthy();
        expect(second.referenceId).not.toBe(first.referenceId);

        const rows = await testDb.select().from(authEmailOtps).where(eq(authEmailOtps.sessionId, requestingSession.sessionId));
        expect(rows).toHaveLength(1);
        expect(rows[0]?.authEmailOtpId).toBe(second.referenceId);
        expect(rows[0]?.emailAddress).toBe('two@example.com');
    });
});
