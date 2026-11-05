import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, authPasskeys, users } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminUserPasskeyDelete } from './adminUserPasskeyDelete';

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

describe('adminUserPasskeyDelete', () => {
    it('deletes a passkey on another user and publishes updates', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser();
        const authPasskeyId = await passkeyInsert(target.user.userId);

        const result = await adminUserPasskeyDelete(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId, authPasskeyId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: authPasskeyId });
        const rows = await testDb.select().from(authPasskeys).where(eq(authPasskeys.authPasskeyId, authPasskeyId));
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: target.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('refuses a passkey that belongs to someone else', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const authPasskeyId = await passkeyInsert(other.user.userId);

        await expect(
            adminUserPasskeyDelete(
                adminMutationParent(admin.user.userId),
                { userId: target.user.userId, authPasskeyId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/adminUserPasskeyDelete: passkey not found/);

        const rows = await testDb.select().from(authPasskeys).where(eq(authPasskeys.authPasskeyId, authPasskeyId));
        expect(rows).toHaveLength(1);
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('rejects an anonymized user', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser();
        const authPasskeyId = await passkeyInsert(target.user.userId);
        await testDb.update(users).set({ status: 'ANONYMIZED' }).where(eq(users.userId, target.user.userId));

        await expect(
            adminUserPasskeyDelete(
                adminMutationParent(admin.user.userId),
                { userId: target.user.userId, authPasskeyId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/adminUserPasskeyDelete: user is anonymized/);

        const rows = await testDb.select().from(authPasskeys).where(eq(authPasskeys.authPasskeyId, authPasskeyId));
        expect(rows).toHaveLength(1);
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows.some((row) => row.message.includes('user is anonymized'))).toBe(true);
    });
});
