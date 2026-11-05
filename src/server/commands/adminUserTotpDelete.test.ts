import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, authTimeBasedOneTimePasswords, sessions, users } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminUserTotpDelete } from './adminUserTotpDelete';

async function totpInsert(userId: string, confirmedAt: Date | null) {
    const authTimeBasedOneTimePasswordId = idCreate();
    await testDb.insert(authTimeBasedOneTimePasswords).values({
        authTimeBasedOneTimePasswordId,
        userId,
        secretEncrypted: 'test-secret',
        confirmedAt,
        recoveryCodes: [],
    });
    return authTimeBasedOneTimePasswordId;
}

describe('adminUserTotpDelete', () => {
    it('removes a confirmed authenticator and clears an in-progress challenge', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser();
        const totpId = await totpInsert(target.user.userId, new Date());
        await testDb
            .update(sessions)
            .set({ pendingTotpUserId: target.user.userId, pendingTotpExpiresAt: new Date(Date.now() + 60_000) })
            .where(eq(sessions.sessionId, target.requestingSession.sessionId));

        const result = await adminUserTotpDelete(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: totpId });
        const rows = await testDb
            .select()
            .from(authTimeBasedOneTimePasswords)
            .where(eq(authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId, totpId));
        expect(rows).toHaveLength(0);
        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, target.requestingSession.sessionId));
        expect(session?.pendingTotpUserId).toBeNull();
        expect(session?.pendingTotpExpiresAt).toBeNull();
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: target.user.userId });
        expect(admin.serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({ sessionId: target.requestingSession.sessionId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('removes an unconfirmed enrollment', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser();
        const totpId = await totpInsert(target.user.userId, null);

        const result = await adminUserTotpDelete(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: totpId });
        const rows = await testDb
            .select()
            .from(authTimeBasedOneTimePasswords)
            .where(eq(authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId, totpId));
        expect(rows).toHaveLength(0);
    });

    it('rejects when no authenticator is set up', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser();

        await expect(
            adminUserTotpDelete(
                adminMutationParent(admin.user.userId),
                { userId: target.user.userId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/adminUserTotpDelete: authenticator not found/);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects an anonymized user', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser();
        const totpId = await totpInsert(target.user.userId, new Date());
        await testDb.update(users).set({ status: 'ANONYMIZED' }).where(eq(users.userId, target.user.userId));

        await expect(
            adminUserTotpDelete(
                adminMutationParent(admin.user.userId),
                { userId: target.user.userId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/adminUserTotpDelete: user is anonymized/);

        const rows = await testDb
            .select()
            .from(authTimeBasedOneTimePasswords)
            .where(eq(authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId, totpId));
        expect(rows).toHaveLength(1);
    });
});
