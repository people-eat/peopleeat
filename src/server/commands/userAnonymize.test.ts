import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { authPasskeys, authTimeBasedOneTimePasswords, cooks, sessions, users } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb, userMutationParent } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { adminUserAnonymize } from './adminUserAnonymize';
import { userAnonymize } from './userAnonymize';

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
    it('scrubs PII, nulls email, terminates sessions, deletes auth, hides cook, and publishes', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Lovelace',
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-01-01',
            preferredCommunication: 'E_MAIL',
            previousEmailAddresses: ['old@example.com'],
        });
        await testDb.insert(cooks).values({ cookId: user.userId, isVisible: true, isApprovedByAdmin: true });
        const passkeyId = await passkeyInsert(user.userId);
        const totpId = await totpInsert(user.userId);

        const otherSessionId = idCreate();
        await testDb.insert(sessions).values({ sessionId: otherSessionId, userId: user.userId });

        const result = await userAnonymize(userMutationParent(user.userId), requestingSession, serverRuntime);

        expect(result).toEqual({ success: true, referenceId: user.userId });

        const [anonymized] = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(anonymized?.status).toBe('ANONYMIZED');
        expect(anonymized?.emailAddress).toBeNull();
        expect(anonymized?.previousEmailAddresses).toEqual([]);
        expect(anonymized?.firstName).toBe(' ');
        expect(anonymized?.lastName).toBe(' ');
        expect(anonymized?.phoneNumber).toBeNull();
        expect(anonymized?.birthDate).toBeNull();
        expect(anonymized?.preferredCommunication).toBeNull();
        expect(anonymized?.profilePictureFileUploadId).toBeNull();

        const userSessions = await testDb.select().from(sessions).where(eq(sessions.userId, user.userId));
        expect(userSessions.length).toBeGreaterThanOrEqual(2);
        expect(userSessions.every((row) => row.wasTerminatedAt != null)).toBe(true);

        const passkeys = await testDb.select().from(authPasskeys).where(eq(authPasskeys.authPasskeyId, passkeyId));
        expect(passkeys).toHaveLength(0);
        const totpRows = await testDb
            .select()
            .from(authTimeBasedOneTimePasswords)
            .where(eq(authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId, totpId));
        expect(totpRows).toHaveLength(0);

        const [cook] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(cook?.isVisible).toBe(false);
        expect(cook?.isApprovedByAdmin).toBe(true);

        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
        expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({ sessionId: requestingSession.sessionId });
    });

    it('rejects when already anonymized, logs, and does not publish', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        await userAnonymize(userMutationParent(user.userId), requestingSession, serverRuntime);
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();
        vi.mocked(serverRuntime.publish.adminUpdates).mockClear();

        await expect(userAnonymize(userMutationParent(user.userId), requestingSession, serverRuntime)).rejects.toThrow(
            /userAnonymize: already anonymized/,
        );

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /already anonymized/.test(row.message))).toBe(true);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});

describe('adminUserAnonymize', () => {
    it('anonymizes a target user', async () => {
        const admin = await commandSetup.withUser();
        const target = await commandSetup.withUser({ firstName: 'Target', lastName: 'User' });

        const result = await adminUserAnonymize(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: target.user.userId });
        const [anonymized] = await testDb.select().from(users).where(eq(users.userId, target.user.userId));
        expect(anonymized?.status).toBe('ANONYMIZED');
        expect(anonymized?.emailAddress).toBeNull();
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: target.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });
});
