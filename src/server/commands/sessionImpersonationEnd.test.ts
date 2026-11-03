import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, sessions } from '../db/schema';
import { toGqlSession } from '../mappers/toGqlSession';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminSessionUserBind } from './adminSessionUserBind';
import { sessionImpersonationEnd } from './sessionImpersonationEnd';

describe('sessionImpersonationEnd', () => {
    it('terminates the impersonation session and restores the admin cookie session', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Return', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'Target', lastName: 'Customer' });

        const start = await adminSessionUserBind(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [impersonationRow] = await testDb.select().from(sessions).where(eq(sessions.sessionId, start.referenceId!));
        const impersonationSession = toGqlSession(impersonationRow!);

        const result = await sessionImpersonationEnd(impersonationSession, admin.serverRuntime);

        expect(result).toEqual({ success: true, referenceId: admin.requestingSession.sessionId });
        expect(impersonationSession.pendingSessionCookieId).toBe(admin.requestingSession.sessionId);

        const [ended] = await testDb.select().from(sessions).where(eq(sessions.sessionId, start.referenceId!));
        expect(ended?.wasTerminatedAt).toBeInstanceOf(Date);
        expect(ended?.impersonationReturnSessionId).toBe(admin.requestingSession.sessionId);

        const [adminSession] = await testDb.select().from(sessions).where(eq(sessions.sessionId, admin.requestingSession.sessionId));
        expect(adminSession?.wasTerminatedAt).toBeNull();
        expect(adminSession?.userId).toBe(admin.user.userId);
    });

    it('mints a fresh admin session when the return session was terminated', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Fallback', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'Target', lastName: 'Customer' });

        const start = await adminSessionUserBind(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        await testDb.update(sessions).set({ wasTerminatedAt: new Date() }).where(eq(sessions.sessionId, admin.requestingSession.sessionId));

        const [impersonationRow] = await testDb.select().from(sessions).where(eq(sessions.sessionId, start.referenceId!));
        const impersonationSession = toGqlSession(impersonationRow!);

        const result = await sessionImpersonationEnd(impersonationSession, admin.serverRuntime);

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        expect(result.referenceId).not.toBe(admin.requestingSession.sessionId);
        expect(impersonationSession.pendingSessionCookieId).toBe(result.referenceId);

        const [restored] = await testDb.select().from(sessions).where(eq(sessions.sessionId, result.referenceId!));
        expect(restored?.userId).toBe(admin.user.userId);
        expect(restored?.wasTerminatedAt).toBeNull();
        expect(restored?.impersonationReturnSessionId).toBeNull();
    });

    it('rejects when the session is not impersonating', async () => {
        const anonymous = await commandSetup();

        await expect(sessionImpersonationEnd(anonymous.requestingSession, anonymous.serverRuntime)).rejects.toThrow(/not impersonating/);
    });

    it('rejects when the return user is no longer an admin', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Revoked', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'Target', lastName: 'Customer' });

        const start = await adminSessionUserBind(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        await testDb.delete(admins).where(eq(admins.adminId, admin.user.userId));

        const [impersonationRow] = await testDb.select().from(sessions).where(eq(sessions.sessionId, start.referenceId!));
        const impersonationSession = toGqlSession(impersonationRow!);

        await expect(sessionImpersonationEnd(impersonationSession, admin.serverRuntime)).rejects.toThrow(/no longer an admin/);
    });

    it('rejects when the return session row is missing', async () => {
        const anonymous = await commandSetup();
        anonymous.requestingSession.impersonationReturnSessionId = idCreate();

        await expect(sessionImpersonationEnd(anonymous.requestingSession, anonymous.serverRuntime)).rejects.toThrow(
            /return session missing admin user/,
        );
    });
});
