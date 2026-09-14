import { eq, inArray } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, sessions } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminSessionTerminateMany } from './adminSessionTerminateMany';

describe('adminSessionTerminateMany', () => {
    it('terminates matching sessions and publishes user + admin updates', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'term-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'term-target', lastName: 'User' });
        const sessionA = idCreate();
        const sessionB = idCreate();
        const sessionKeep = idCreate();
        await testDb.insert(sessions).values([
            { sessionId: sessionA, userId: target.user.userId },
            { sessionId: sessionB, userId: target.user.userId },
            { sessionId: sessionKeep, userId: target.user.userId },
        ]);

        // Act
        const result = await adminSessionTerminateMany(
            adminMutationParent(admin.user.userId),
            { sessionIds: [sessionA, sessionB] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true });
        const rows = await testDb
            .select()
            .from(sessions)
            .where(inArray(sessions.sessionId, [sessionA, sessionB, sessionKeep]));
        const byId = Object.fromEntries(rows.map((row) => [row.sessionId, row]));
        expect(byId[sessionA]?.wasTerminatedAt).toBeInstanceOf(Date);
        expect(byId[sessionB]?.wasTerminatedAt).toBeInstanceOf(Date);
        expect(byId[sessionKeep]?.wasTerminatedAt).toBeNull();

        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: target.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('terminates sessions belonging to different users', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'term-admin2', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const userA = await commandSetup.withUser({ firstName: 'term-a', lastName: 'User' });
        const userB = await commandSetup.withUser({ firstName: 'term-b', lastName: 'User' });
        const sessionA = idCreate();
        const sessionB = idCreate();
        await testDb.insert(sessions).values([
            { sessionId: sessionA, userId: userA.user.userId },
            { sessionId: sessionB, userId: userB.user.userId },
        ]);

        // Act
        const result = await adminSessionTerminateMany(
            adminMutationParent(admin.user.userId),
            { sessionIds: [sessionA, sessionB] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true });
        const rows = await testDb
            .select()
            .from(sessions)
            .where(inArray(sessions.sessionId, [sessionA, sessionB]));
        expect(rows.every((row) => row.wasTerminatedAt != null)).toBe(true);
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: userA.user.userId });
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: userB.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('returns success without publishing when sessionIds is empty', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'term-empty', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act
        const result = await adminSessionTerminateMany(
            adminMutationParent(admin.user.userId),
            { sessionIds: [] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true });
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('publishes adminUpdates even when no sessions match', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'term-miss', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const unknownSessionId = idCreate();

        // Act
        const result = await adminSessionTerminateMany(
            adminMutationParent(admin.user.userId),
            { sessionIds: [unknownSessionId] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true });
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
        const [missing] = await testDb.select().from(sessions).where(eq(sessions.sessionId, unknownSessionId));
        expect(missing).toBeUndefined();
    });
});
