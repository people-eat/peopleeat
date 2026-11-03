import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { admins, sessions, users } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminSessionUserBind } from './adminSessionUserBind';

describe('adminSessionUserBind', () => {
    it('mints an impersonation session and leaves the admin session bound', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Impersonate', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'Target', lastName: 'Customer' });

        const result = await adminSessionUserBind(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        expect(admin.requestingSession.pendingSessionCookieId).toBe(result.referenceId);

        const [adminSession] = await testDb.select().from(sessions).where(eq(sessions.sessionId, admin.requestingSession.sessionId));
        expect(adminSession?.userId).toBe(admin.user.userId);
        expect(adminSession?.impersonationReturnSessionId).toBeNull();

        const [impersonationSession] = await testDb.select().from(sessions).where(eq(sessions.sessionId, result.referenceId!));
        expect(impersonationSession?.userId).toBe(target.user.userId);
        expect(impersonationSession?.impersonationReturnSessionId).toBe(admin.requestingSession.sessionId);
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

        expect(admin.requestingSession.pendingSessionCookieId).toBeUndefined();
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

    it('rejects nesting when already impersonating', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Nested', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'Target', lastName: 'Customer' });
        admin.requestingSession.impersonationReturnSessionId = admin.requestingSession.sessionId;

        await expect(
            adminSessionUserBind(
                adminMutationParent(admin.user.userId),
                { userId: target.user.userId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/already impersonating/);
    });
});
