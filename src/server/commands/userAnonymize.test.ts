import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { authOauthIdentities, authPasskeys, authTimeBasedOneTimePasswords, cooks, sessions, users } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb, userMutationParent } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import * as authOtpUtils from '../utils/authOtpUtils';
import { USER_ACCOUNT_DELETION_COOL_OFF_MS } from '../utils/userDualAcceptedEventCoolOff';
import { adminUserAnonymize } from './adminUserAnonymize';
import { userAnonymize } from './userAnonymize';
import { userAnonymizeOtpRequest } from './userAnonymizeOtpRequest';

async function passkeyInsert(userId: string) {
    const authPasskeyId = idCreate();
    await testDb.insert(authPasskeys).values({
        authPasskeyId,
        userId,
        credentialId: `cred-${authPasskeyId}`,
        publicKey: Buffer.from([1, 2, 3, 4]),
        counter: 0,
        transports: ['internal'],
        deviceType: 'singleDevice',
        backedUp: false,
    });
    return authPasskeyId;
}

async function totpInsert(userId: string) {
    const authTimeBasedOneTimePasswordId = idCreate();
    await testDb.insert(authTimeBasedOneTimePasswords).values({
        authTimeBasedOneTimePasswordId,
        userId,
        secretEncrypted: 'test-secret',
        confirmedAt: new Date(),
        recoveryCodes: [],
    });
    return authTimeBasedOneTimePasswordId;
}

describe('userAnonymize', () => {
    async function scheduleWithCode(
        serverRuntime: Awaited<ReturnType<typeof commandSetup.withUser>>['serverRuntime'],
        requestingSession: Awaited<ReturnType<typeof commandSetup.withUser>>['requestingSession'],
        userId: string,
        code: string,
    ) {
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockReturnValue(code);
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: idCreate() });
        await userAnonymizeOtpRequest(userMutationParent(userId), { locale: 'de' }, requestingSession, serverRuntime);
        vi.spyOn(authOtpUtils, 'authOtpCodeGenerate').mockRestore();
        return userAnonymize(userMutationParent(userId), { code }, requestingSession, serverRuntime);
    }

    it('schedules deletion instead of scrubbing immediately', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Lovelace',
            phoneNumber: phoneNumberCreate(),
        });
        await testDb.insert(cooks).values({ cookId: user.userId, isVisible: true, isApprovedByAdmin: true });

        const before = Date.now();
        const result = await scheduleWithCode(serverRuntime, requestingSession, user.userId, '246810');
        const after = Date.now();

        expect(result).toEqual({ success: true, referenceId: user.userId });

        const [scheduled] = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(scheduled?.status).toBe('ACTIVE');
        expect(scheduled?.emailAddress).toBeTruthy();
        expect(scheduled?.accountDeletionScheduledFor).toBeTruthy();
        const scheduledMs = scheduled!.accountDeletionScheduledFor!.getTime();
        expect(scheduledMs).toBeGreaterThanOrEqual(before + USER_ACCOUNT_DELETION_COOL_OFF_MS - 1000);
        expect(scheduledMs).toBeLessThanOrEqual(after + USER_ACCOUNT_DELETION_COOL_OFF_MS + 1000);

        expect(serverRuntime.jobs.enqueue).toHaveBeenCalled();
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('rejects when already anonymized, logs, and does not publish', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        await testDb.update(users).set({ status: 'ANONYMIZED' }).where(eq(users.userId, user.userId));
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();
        vi.mocked(serverRuntime.publish.adminUpdates).mockClear();

        await expect(scheduleWithCode(serverRuntime, requestingSession, user.userId, '135792')).rejects.toThrow(/already anonymized/);

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /already anonymized/.test(row.message))).toBe(true);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});

describe('adminUserAnonymize', () => {
    it('IMMEDIATE scrubs PII, nulls email, terminates sessions, deletes auth, hides cook', async () => {
        const admin = await commandSetup.withUser();
        const target = await commandSetup.withUser({
            firstName: 'Target',
            lastName: 'User',
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-01-01',
            preferredCommunication: 'E_MAIL',
            previousEmailAddresses: ['old@example.com'],
        });
        await testDb.insert(cooks).values({ cookId: target.user.userId, isVisible: true, isApprovedByAdmin: true });
        const passkeyId = await passkeyInsert(target.user.userId);
        const totpId = await totpInsert(target.user.userId);
        const oauthIdentityId = idCreate();
        await testDb.insert(authOauthIdentities).values({
            authOauthIdentityId: oauthIdentityId,
            userId: target.user.userId,
            provider: 'GOOGLE',
            subject: `sub-${target.user.userId}`,
        });
        const otherSessionId = idCreate();
        await testDb.insert(sessions).values({ sessionId: otherSessionId, userId: target.user.userId });

        const result = await adminUserAnonymize(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId, mode: 'IMMEDIATE' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: target.user.userId });
        const [anonymized] = await testDb.select().from(users).where(eq(users.userId, target.user.userId));
        expect(anonymized?.status).toBe('ANONYMIZED');
        expect(anonymized?.emailAddress).toBeNull();
        expect(anonymized?.previousEmailAddresses).toEqual([]);
        expect(anonymized?.firstName).toBe(' ');
        expect(anonymized?.lastName).toBe(' ');
        expect(anonymized?.phoneNumber).toBeNull();
        expect(anonymized?.accountDeletionScheduledFor).toBeNull();

        const userSessions = await testDb.select().from(sessions).where(eq(sessions.userId, target.user.userId));
        expect(userSessions.every((row) => row.wasTerminatedAt != null)).toBe(true);
        expect(await testDb.select().from(authPasskeys).where(eq(authPasskeys.authPasskeyId, passkeyId))).toHaveLength(0);
        expect(
            await testDb
                .select()
                .from(authTimeBasedOneTimePasswords)
                .where(eq(authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId, totpId)),
        ).toHaveLength(0);
        expect(
            await testDb.select().from(authOauthIdentities).where(eq(authOauthIdentities.authOauthIdentityId, oauthIdentityId)),
        ).toHaveLength(0);

        const [cook] = await testDb.select().from(cooks).where(eq(cooks.cookId, target.user.userId));
        expect(cook?.isVisible).toBe(false);

        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: target.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('SCHEDULE sets accountDeletionScheduledFor without scrubbing', async () => {
        const admin = await commandSetup.withUser();
        const target = await commandSetup.withUser({ firstName: 'Later', lastName: 'Delete' });

        const result = await adminUserAnonymize(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId, mode: 'SCHEDULE' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: target.user.userId });
        const [row] = await testDb.select().from(users).where(eq(users.userId, target.user.userId));
        expect(row?.status).toBe('ACTIVE');
        expect(row?.emailAddress).toBeTruthy();
        expect(row?.accountDeletionScheduledFor).toBeTruthy();
        expect(admin.serverRuntime.jobs.enqueue).toHaveBeenCalled();
    });
});
