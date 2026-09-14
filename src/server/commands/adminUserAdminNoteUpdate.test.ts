import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, users } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminUserAdminNoteUpdate } from './adminUserAdminNoteUpdate';

describe('adminUserAdminNoteUpdate', () => {
    it('updates the admin note and publishes adminUpdates', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'note-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'noted', lastName: 'User', adminNote: '' });

        // Act
        const result = await adminUserAdminNoteUpdate(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId, adminNote: '  Called about gift card  ' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: target.user.userId });
        const [row] = await testDb.select().from(users).where(eq(users.userId, target.user.userId));
        expect(row?.adminNote).toBe('Called about gift card');
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('allows clearing the note to an empty string', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'note-clear-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'clear-me', lastName: 'User', adminNote: 'old note' });

        // Act
        const result = await adminUserAdminNoteUpdate(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId, adminNote: '   ' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: target.user.userId });
        const [row] = await testDb.select().from(users).where(eq(users.userId, target.user.userId));
        expect(row?.adminNote).toBe('');
    });

    it('throws when the user is missing, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'note-missing-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const userId = idCreate();

        // Act + Assert
        await expect(
            adminUserAdminNoteUpdate(
                adminMutationParent(admin.user.userId),
                { userId, adminNote: 'orphan' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/user not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/user not found/);
    });
});
