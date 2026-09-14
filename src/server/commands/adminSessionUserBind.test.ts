import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { admins, sessions, users } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminSessionUserBind } from './adminSessionUserBind';

describe('adminSessionUserBind', () => {
    it('rebinds the admin session to an ACTIVE user and publishes', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Impersonate', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'Target', lastName: 'Customer' });

        const result = await adminSessionUserBind(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: target.user.userId });
        const [row] = await testDb.select().from(sessions).where(eq(sessions.sessionId, admin.requestingSession.sessionId));
        expect(row?.userId).toBe(target.user.userId);
        expect(admin.requestingSession.userId).toBe(target.user.userId);
        expect(admin.serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({ sessionId: admin.requestingSession.sessionId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects binding to a non-ACTIVE user', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Ban', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'Banned', lastName: 'User' });
        await testDb.update(users).set({ status: 'BANNED' }).where(eq(users.userId, target.user.userId));

        await expect(
            adminSessionUserBind(
                adminMutationParent(admin.user.userId),
                { userId: target.user.userId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/user is not ACTIVE/);

        expect(admin.requestingSession.userId).toBe(admin.user.userId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('rejects binding to the current admin', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Self', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminSessionUserBind(
                adminMutationParent(admin.user.userId),
                { userId: admin.user.userId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/cannot bind to the current admin/);
    });
});
