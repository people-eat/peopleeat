import { eq } from 'drizzle-orm';
import * as OTPAuth from 'otpauth';
import { describe, expect, it } from 'vitest';

import { authTimeBasedOneTimePasswords, sessions } from '../db/schema';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { authTotpSecretDecrypt } from '../utils/authTotpUtils';
import { authTotpChallengeDelete } from './authTotpChallengeDelete';
import { authTotpDisable } from './authTotpDisable';
import { authTotpEnrollCancel } from './authTotpEnrollCancel';
import { authTotpEnrollConfirm } from './authTotpEnrollConfirm';
import { authTotpEnrollStart } from './authTotpEnrollStart';
import { authTotpVerify } from './authTotpVerify';
import { sessionPrimaryAuthComplete } from './sessionPrimaryAuthComplete';

function currentTotpCode(secret: string): string {
    return new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
    }).generate();
}

describe('authTotpCommands', () => {
    it('enrolls, confirms with a valid code, and returns recovery codes once', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const parent = userMutationParent(user.userId);

        const start = await authTotpEnrollStart(parent, requestingSession, serverRuntime);
        expect(start.secret).toMatch(/^[A-Z2-7]+$/);
        expect(start.otpauthUrl).toContain('otpauth://totp/');

        const [pending] = await testDb
            .select()
            .from(authTimeBasedOneTimePasswords)
            .where(eq(authTimeBasedOneTimePasswords.userId, user.userId));
        expect(pending?.confirmedAt).toBeNull();
        expect(authTotpSecretDecrypt(pending!.secretEncrypted)).toBe(start.secret);

        const confirm = await authTotpEnrollConfirm(parent, { code: currentTotpCode(start.secret) }, requestingSession, serverRuntime);
        expect(confirm.recoveryCodes).toHaveLength(10);

        const [confirmed] = await testDb
            .select()
            .from(authTimeBasedOneTimePasswords)
            .where(eq(authTimeBasedOneTimePasswords.userId, user.userId));
        expect(confirmed?.confirmedAt).toBeInstanceOf(Date);
        expect(confirmed?.recoveryCodes).toHaveLength(10);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('cancels a pending enrollment', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const parent = userMutationParent(user.userId);
        await authTotpEnrollStart(parent, requestingSession, serverRuntime);

        const result = await authTotpEnrollCancel(parent, requestingSession, serverRuntime);
        expect(result.success).toBe(true);

        const rows = await testDb.select().from(authTimeBasedOneTimePasswords).where(eq(authTimeBasedOneTimePasswords.userId, user.userId));
        expect(rows).toHaveLength(0);
    });

    it('disables confirmed TOTP with a valid authenticator code', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const parent = userMutationParent(user.userId);
        const start = await authTotpEnrollStart(parent, requestingSession, serverRuntime);
        await authTotpEnrollConfirm(parent, { code: currentTotpCode(start.secret) }, requestingSession, serverRuntime);

        const result = await authTotpDisable(parent, { code: currentTotpCode(start.secret) }, requestingSession, serverRuntime);
        expect(result.success).toBe(true);

        const rows = await testDb.select().from(authTimeBasedOneTimePasswords).where(eq(authTimeBasedOneTimePasswords.userId, user.userId));
        expect(rows).toHaveLength(0);
    });

    it('leaves the session unbound after primary auth when TOTP is confirmed', async () => {
        const signedIn = await commandSetup.withUser();
        const parent = userMutationParent(signedIn.user.userId);
        const start = await authTotpEnrollStart(parent, signedIn.requestingSession, signedIn.serverRuntime);
        await authTotpEnrollConfirm(parent, { code: currentTotpCode(start.secret) }, signedIn.requestingSession, signedIn.serverRuntime);

        const anonymous = await commandSetup();
        const outcome = await sessionPrimaryAuthComplete(
            anonymous.requestingSession.sessionId,
            signedIn.user.userId,
            anonymous.requestingSession,
            anonymous.serverRuntime,
        );
        expect(outcome).toBe('totpPending');
        expect(anonymous.requestingSession.userId).toBeNull();

        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, anonymous.requestingSession.sessionId));
        expect(session?.pendingTotpUserId).toBe(signedIn.user.userId);
        expect(session?.userId).toBeNull();
    });

    it('binds the session after a valid TOTP verify', async () => {
        const signedIn = await commandSetup.withUser();
        const parent = userMutationParent(signedIn.user.userId);
        const start = await authTotpEnrollStart(parent, signedIn.requestingSession, signedIn.serverRuntime);
        await authTotpEnrollConfirm(parent, { code: currentTotpCode(start.secret) }, signedIn.requestingSession, signedIn.serverRuntime);

        const anonymous = await commandSetup();
        await sessionPrimaryAuthComplete(
            anonymous.requestingSession.sessionId,
            signedIn.user.userId,
            anonymous.requestingSession,
            anonymous.serverRuntime,
        );

        const result = await authTotpVerify({ code: currentTotpCode(start.secret) }, anonymous.requestingSession, anonymous.serverRuntime);
        expect(result).toEqual({ success: true, referenceId: signedIn.user.userId });
        expect(anonymous.requestingSession.userId).toBe(signedIn.user.userId);

        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, anonymous.requestingSession.sessionId));
        expect(session?.userId).toBe(signedIn.user.userId);
        expect(session?.pendingTotpUserId).toBeNull();
    });

    it('accepts a recovery code once and rejects replay', async () => {
        const signedIn = await commandSetup.withUser();
        const parent = userMutationParent(signedIn.user.userId);
        const start = await authTotpEnrollStart(parent, signedIn.requestingSession, signedIn.serverRuntime);
        const confirm = await authTotpEnrollConfirm(
            parent,
            { code: currentTotpCode(start.secret) },
            signedIn.requestingSession,
            signedIn.serverRuntime,
        );
        const recoveryCode = confirm.recoveryCodes[0]!;

        const first = await commandSetup();
        await sessionPrimaryAuthComplete(
            first.requestingSession.sessionId,
            signedIn.user.userId,
            first.requestingSession,
            first.serverRuntime,
        );
        const firstVerify = await authTotpVerify({ code: recoveryCode }, first.requestingSession, first.serverRuntime);
        expect(firstVerify.success).toBe(true);

        const second = await commandSetup();
        await sessionPrimaryAuthComplete(
            second.requestingSession.sessionId,
            signedIn.user.userId,
            second.requestingSession,
            second.serverRuntime,
        );
        const replay = await authTotpVerify({ code: recoveryCode }, second.requestingSession, second.serverRuntime);
        expect(replay).toEqual({ success: false });
        expect(second.requestingSession.userId).toBeNull();
    });

    it('clears a pending challenge on delete', async () => {
        const signedIn = await commandSetup.withUser();
        const parent = userMutationParent(signedIn.user.userId);
        const start = await authTotpEnrollStart(parent, signedIn.requestingSession, signedIn.serverRuntime);
        await authTotpEnrollConfirm(parent, { code: currentTotpCode(start.secret) }, signedIn.requestingSession, signedIn.serverRuntime);

        const anonymous = await commandSetup();
        await sessionPrimaryAuthComplete(
            anonymous.requestingSession.sessionId,
            signedIn.user.userId,
            anonymous.requestingSession,
            anonymous.serverRuntime,
        );

        const result = await authTotpChallengeDelete(anonymous.requestingSession, anonymous.serverRuntime);
        expect(result.success).toBe(true);

        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, anonymous.requestingSession.sessionId));
        expect(session?.pendingTotpUserId).toBeNull();
        expect(session?.pendingTotpExpiresAt).toBeNull();
    });

    it('rejects enroll confirm with a wrong code', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const parent = userMutationParent(user.userId);
        await authTotpEnrollStart(parent, requestingSession, serverRuntime);

        await expect(authTotpEnrollConfirm(parent, { code: '000000' }, requestingSession, serverRuntime)).rejects.toThrow(
            /authTotpEnrollConfirm: invalid code/,
        );
    });
});
